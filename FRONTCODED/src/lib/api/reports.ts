export class ReportsApiError extends Error {
  constructor(
    public status: number,
    message = `HTTP ${status}`,
  ) {
    super(message);
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveFilename(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition");
  if (!contentDisposition) {
    return fallback;
  }

  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

async function assertPdfResponse(response: Response) {
  if (response.ok) {
    return response;
  }

  let message = `HTTP ${response.status}`;
  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      message = payload.message;
    }
  } catch {
  }

  throw new ReportsApiError(response.status, message);
}

async function downloadPdf(response: Response, fallbackFilename: string) {
  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = resolveFilename(response, fallbackFilename);
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadKpiSlaPdfReport(authenticatedFetch: Fetcher) {
  const response = await assertPdfResponse(
    await authenticatedFetch("/api/reports/kpi-sla/pdf"),
  );
  await downloadPdf(response, "rapport-kpi-sla-cgi-flow.pdf");
}

export async function downloadSlaPdfReport(authenticatedFetch: Fetcher) {
  const response = await assertPdfResponse(
    await authenticatedFetch("/api/reports/sla/pdf"),
  );
  await downloadPdf(response, "rapport-sla-cgi-flow.pdf");
}
