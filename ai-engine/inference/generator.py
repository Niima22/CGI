from __future__ import annotations

import json
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer

from utils.config import DEFAULT_GENERATION_MODEL, GENERATION_MODEL_DIR


class GenerationModelNotReady(RuntimeError):
    pass


class ResolutionGenerator:
    def __init__(
        self,
        adapter_dir: Path = GENERATION_MODEL_DIR,
        base_model: str = DEFAULT_GENERATION_MODEL,
        max_new_tokens: int = 512,
    ) -> None:
        self.adapter_dir = Path(adapter_dir)
        self.base_model = base_model
        self.max_new_tokens = max_new_tokens
        self.tokenizer = None
        self.model = None

    def load(self) -> None:
        if not self.adapter_dir.exists() or not any(self.adapter_dir.iterdir()):
            raise GenerationModelNotReady(
                f"Generation model not found in {self.adapter_dir}. Run training/fine_tune_generator.py first."
            )

        self.tokenizer = AutoTokenizer.from_pretrained(self.adapter_dir, trust_remote_code=True)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        base = AutoModelForCausalLM.from_pretrained(
            self.base_model,
            device_map="auto",
            trust_remote_code=True,
        )
        self.model = PeftModel.from_pretrained(base, self.adapter_dir)
        self.model.eval()

    def generate(self, payload: dict) -> str:
        if self.model is None or self.tokenizer is None:
            self.load()

        prompt = (
            "<|system|>\n"
            "Tu es un assistant qualité spécialisé dans les tickets support. "
            "Génère une résolution professionnelle, structurée et naturelle.\n"
            "<|user|>\n"
            "Génère une résolution de ticket professionnelle\n"
            f"Entrée: {json.dumps(payload, ensure_ascii=False)}\n"
            "<|assistant|>\n"
        )
        inputs = self.tokenizer(prompt, return_tensors="pt").to(self.model.device)

        with torch.no_grad():
            output = self.model.generate(
                **inputs,
                max_new_tokens=self.max_new_tokens,
                do_sample=False,
                pad_token_id=self.tokenizer.eos_token_id,
            )

        decoded = self.tokenizer.decode(output[0], skip_special_tokens=True)
        return decoded.split("<|assistant|>")[-1].strip()
