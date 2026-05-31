from app.models.schemas import (
    CriterionEvaluation,
    SolutionEvaluationRequest,
    SolutionEvaluationResponse,
)


class EvaluationService:
    def evaluate(self, request: SolutionEvaluationRequest) -> SolutionEvaluationResponse:
        trame_status, trame_comment = self._evaluate_resolution_frame(request)
        type_status, type_comment = self._evaluate_resolution_type(request)

        return SolutionEvaluationResponse(
            ticket_id=request.ticket_id,
            bannette=request.bannette,
            trame_resolution=CriterionEvaluation(status=trame_status, comment=trame_comment),
            type_resolution=CriterionEvaluation(status=type_status, comment=type_comment),
        )

    def _evaluate_resolution_frame(self, request: SolutionEvaluationRequest) -> tuple[str, str]:
        frame = request.resolution_frame.lower()
        has_title = request.title.lower() in frame
        has_summary = len(request.synthese.strip()) >= 20 and request.synthese[:24].lower() in frame
        has_actions = all(action.lower() in frame for action in request.actions)
        has_bannette = request.bannette.lower() in frame

        missing = []
        if not has_title:
            missing.append("titre")
        if not has_summary:
            missing.append("synthese")
        if not has_actions:
            missing.append("actions")
        if not has_bannette:
            missing.append("bannette")

        if missing:
            return "KO", "Elements manquants dans la trame: " + ", ".join(missing) + "."

        return "OK", "La trame reprend les elements obligatoires du ticket."

    def _evaluate_resolution_type(self, request: SolutionEvaluationRequest) -> tuple[str, str]:
        action_count = len([action for action in request.actions if action.strip()])
        text_size = len(request.resolution_frame.strip())

        if action_count < 1:
            return "KO", "Le type de resolution ne peut pas etre qualifie sans action realisee."

        if text_size < 180:
            return "KO", "La resolution est trop courte pour justifier le type de traitement."

        return "OK", "Le type de resolution est coherent avec les actions et la synthese."
