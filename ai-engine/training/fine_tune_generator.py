from __future__ import annotations

import argparse
import json
from pathlib import Path

from datasets import Dataset
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer, DataCollatorForLanguageModeling, Trainer, TrainingArguments

from utils.config import DEFAULT_GENERATION_MODEL, GENERATION_MODEL_DIR, PROCESSED_DATA_DIR


def format_instruction(record: dict) -> str:
    return (
        "<|system|>\n"
        "Tu es un assistant qualité spécialisé dans les tickets support. "
        "Tu génères des trames de résolution professionnelles, claires et naturelles.\n"
        "<|user|>\n"
        f"{record['instruction']}\n"
        f"Entrée: {json.dumps(record['input'], ensure_ascii=False)}\n"
        "<|assistant|>\n"
        f"{record['output']}"
    )


def load_instruction_dataset(path: Path) -> Dataset:
    if not path.exists():
        raise FileNotFoundError(f"Generation dataset not found: {path}")

    records = []
    with path.open("r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                records.append(json.loads(line))

    return Dataset.from_dict({"text": [format_instruction(record) for record in records]})


def fine_tune_generator(
    dataset_path: Path = PROCESSED_DATA_DIR / "generation_train.jsonl",
    output_dir: Path = GENERATION_MODEL_DIR,
    base_model: str = DEFAULT_GENERATION_MODEL,
    epochs: int = 3,
    batch_size: int = 1,
    max_length: int = 1024,
) -> None:
    tokenizer = AutoTokenizer.from_pretrained(base_model, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        base_model,
        device_map="auto",
        trust_remote_code=True,
    )

    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    model = get_peft_model(model, lora_config)

    dataset = load_instruction_dataset(dataset_path)

    def tokenize(batch):
        return tokenizer(
            batch["text"],
            truncation=True,
            padding="max_length",
            max_length=max_length,
        )

    tokenized = dataset.map(tokenize, batched=True, remove_columns=["text"])
    collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    args = TrainingArguments(
        output_dir=str(output_dir),
        per_device_train_batch_size=batch_size,
        gradient_accumulation_steps=8,
        num_train_epochs=epochs,
        learning_rate=2e-4,
        fp16=True,
        logging_steps=10,
        save_strategy="epoch",
        report_to=[],
    )

    trainer = Trainer(
        model=model,
        args=args,
        train_dataset=tokenized,
        data_collator=collator,
    )
    trainer.train()

    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))


def main() -> None:
    parser = argparse.ArgumentParser(description="Fine-tune a generation model with LoRA.")
    parser.add_argument("--dataset", default=str(PROCESSED_DATA_DIR / "generation_train.jsonl"))
    parser.add_argument("--output-dir", default=str(GENERATION_MODEL_DIR))
    parser.add_argument("--base-model", default=DEFAULT_GENERATION_MODEL)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=1)
    parser.add_argument("--max-length", type=int, default=1024)
    args = parser.parse_args()

    fine_tune_generator(
        dataset_path=Path(args.dataset),
        output_dir=Path(args.output_dir),
        base_model=args.base_model,
        epochs=args.epochs,
        batch_size=args.batch_size,
        max_length=args.max_length,
    )


if __name__ == "__main__":
    main()
