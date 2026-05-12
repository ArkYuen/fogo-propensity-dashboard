import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AgentRequest = {
  message?: string;
  question?: string;
  prompt?: string;
  input?: string;
  query?: string;
};

const AUDIENCE_COUNTS = {
  totalScored: 200_000,
  persuadable: 20_036,
  lookalikeSeed: 20_267,
  atRiskHighPotential: 18_750,
};

const TOP_DMAS = [
  ["New York", 4_380],
  ["Miami–Ft. Lauderdale", 3_165],
  ["Dallas–Ft. Worth", 2_940],
  ["Houston", 2_610],
  ["Chicago", 2_245],
] as const;

const HVC_SEGMENTS = [
  ["Premium loyalists", "42,100 customers", "$18.4M revenue", "$74 avg check"],
  ["High-spend occasionals", "31,800 customers", "$13.2M revenue", "$96 avg check"],
  ["Growth potential", "54,700 customers", "$10.6M revenue", "$58 avg check"],
  ["Emerging guests", "71,400 customers", "$7.9M revenue", "$49 avg check"],
] as const;

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function answerQuestion(question: string) {
  const q = question.toLowerCase();

  if (q.includes("dma") || q.includes("region") || q.includes("market")) {
    return `The largest persuadable DMAs are ${TOP_DMAS.map(
      ([name, count]) => `${name} (${formatNumber(count)} customers)`,
    ).join(", ")}. For paid media, I would prioritize New York, Miami–Ft. Lauderdale, Dallas–Ft. Worth, Houston, and Chicago because they combine scale with high persuadability.`;
  }

  if (
    q.includes("high-value") ||
    q.includes("hvc") ||
    q.includes("revenue segment") ||
    q.includes("segment")
  ) {
    return `The high-value customer segments are: ${HVC_SEGMENTS.map(
      ([name, customers, revenue, avgCheck]) => `${name}: ${customers}, ${revenue}, ${avgCheck}`,
    ).join("; ")}. Premium loyalists are the strongest retention base, while growth potential customers are the largest expansion pool.`;
  }

  if (
    q.includes("recommend") ||
    q.includes("activation") ||
    q.includes("paid media") ||
    q.includes("audience")
  ) {
    return `I recommend three activation audiences: 1) Persuadable diners in the top 5 DMAs (${formatNumber(
      15_340,
    )} customers) for paid social and CRM, 2) lookalike seed premium loyalists (${formatNumber(
      AUDIENCE_COUNTS.lookalikeSeed,
    )} customers) for Meta, Google, and DV360 expansion, and 3) at-risk high-potential guests (${formatNumber(
      AUDIENCE_COUNTS.atRiskHighPotential,
    )} customers) for a controlled CRM/app-push test.`;
  }

  if (q.includes("count") || q.includes("how many") || q.includes("each")) {
    return `Current audience counts: ${formatNumber(
      AUDIENCE_COUNTS.totalScored,
    )} total scored customers, ${formatNumber(
      AUDIENCE_COUNTS.persuadable,
    )} persuadable customers, ${formatNumber(
      AUDIENCE_COUNTS.lookalikeSeed,
    )} lookalike seed customers, and ${formatNumber(
      AUDIENCE_COUNTS.atRiskHighPotential,
    )} at-risk high-potential customers.`;
  }

  return `Ask Tom is reading the Fogo propensity demo layer. The key takeaway: ${formatNumber(
    AUDIENCE_COUNTS.totalScored,
  )} ChurrasGO users are scored, with ${formatNumber(
    AUDIENCE_COUNTS.persuadable,
  )} persuadable customers, ${formatNumber(
    AUDIENCE_COUNTS.lookalikeSeed,
  )} lookalike seed customers, and ${formatNumber(
    AUDIENCE_COUNTS.atRiskHighPotential,
  )} at-risk high-potential customers ready for activation. The strongest demo story is BigQuery views powering audience sizing, activation exports, write-back, and lift measurement.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AgentRequest;
    const question =
      body.question ?? body.message ?? body.prompt ?? body.input ?? body.query ?? "";

    const answer = answerQuestion(question);

    return NextResponse.json({
      answer,
      message: answer,
      source: "demo-agent-fallback",
      status: "ok",
    });
  } catch (error) {
    console.error("Ask Tom route failed", error);
    return NextResponse.json(
      {
        answer:
          "Ask Tom hit an error while answering. The dashboard data is still available, but the agent route needs review.",
        message:
          "Ask Tom hit an error while answering. The dashboard data is still available, but the agent route needs review.",
        source: "demo-agent-fallback",
        status: "error",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Ask Tom demo agent",
    route: "/api/agent/chat",
  });
}
