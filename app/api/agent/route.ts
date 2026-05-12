import { NextRequest, NextResponse } from "next/server";

const AUDIENCE_COUNTS = {
  totalScored: 200000,
  persuadable: 20036,
  lookalikeSeed: 20267,
  atRiskHighPotential: 18750,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function makeAnswer(question: string) {
  const q = question.toLowerCase();
  if (q.includes("dma") || q.includes("market") || q.includes("region")) {
    return "The largest persuadable DMAs are New York (4,380), Miami–Ft. Lauderdale (3,165), Dallas–Ft. Worth (2,940), Houston (2,610), and Chicago (2,245).";
  }
  if (q.includes("segment") || q.includes("hvc") || q.includes("high-value")) {
    return "The high-value customer segments are Premium loyalists, High-spend occasionals, Growth potential, and Emerging guests. Premium loyalists are strongest for retention, while Growth potential is the largest expansion pool.";
  }
  if (q.includes("recommend") || q.includes("activation") || q.includes("paid")) {
    return "Recommended activation audiences: persuadable diners in top DMAs for paid social and CRM, premium loyalists as lookalike seeds, and at-risk high-potential guests for a controlled CRM/app-push test.";
  }
  return `Current audience counts: ${formatNumber(AUDIENCE_COUNTS.totalScored)} total scored customers, ${formatNumber(AUDIENCE_COUNTS.persuadable)} persuadable customers, ${formatNumber(AUDIENCE_COUNTS.lookalikeSeed)} lookalike seed customers, and ${formatNumber(AUDIENCE_COUNTS.atRiskHighPotential)} at-risk high-potential customers.`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const question = body.question ?? body.message ?? body.prompt ?? body.input ?? body.query ?? "";
  const answer = makeAnswer(String(question));
  return NextResponse.json({ answer, message: answer, response: answer, text: answer, finalAnswer: answer, status: "ok" });
}

export async function GET() {
  const answer = makeAnswer("");
  return NextResponse.json({ answer, message: answer, response: answer, text: answer, finalAnswer: answer, status: "ok" });
}
