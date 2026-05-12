"use client";

import { useState } from "react";

const quickPrompts = [
  "How many customers are in each audience?",
  "Which DMAs have the largest persuadable audiences?",
  "Summarize the high-value customer revenue segments.",
  "Recommend three paid media activation audiences.",
];

function localAnswer(question: string) {
  const q = question.toLowerCase();

  if (q.includes("dma") || q.includes("market") || q.includes("region")) {
    return "The largest persuadable DMAs are New York (4,380), Miami–Ft. Lauderdale (3,165), Dallas–Ft. Worth (2,940), Houston (2,610), and Chicago (2,245). These are the first markets I would use for paid social and CRM activation.";
  }

  if (q.includes("segment") || q.includes("hvc") || q.includes("high-value") || q.includes("revenue")) {
    return "The high-value customer segments are Premium loyalists, High-spend occasionals, Growth potential, and Emerging guests. Premium loyalists are the strongest retention base; Growth potential is the largest expansion pool; High-spend occasionals are useful for occasion-based offers.";
  }

  if (q.includes("recommend") || q.includes("activation") || q.includes("paid") || q.includes("audience")) {
    return "Recommended activation plan: 1) Persuadable diners in the top 5 DMAs for paid social and CRM, 2) premium loyalists as lookalike seeds for Meta, Google, and DV360, and 3) at-risk high-potential guests for a controlled CRM/app-push test with holdouts.";
  }

  return "Current audience counts: 200,000 total scored customers, 20,036 persuadable customers, 20,267 lookalike seed customers, and 18,750 at-risk high-potential customers. The core demo story is BigQuery views powering audience sizing, activation exports, platform write-back, lift measurement, and retraining signals.";
}

export function AskTomFallback() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [answer, setAnswer] = useState(
    "Ask a Fogo propensity question or use a suggested prompt.",
  );
  const [loading, setLoading] = useState(false);

  async function ask(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion) return;

    setQuestion(cleanQuestion);
    setLoading(true);

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, message: cleanQuestion }),
      });

      if (!res.ok) throw new Error(`Agent route returned ${res.status}`);

      const data = await res.json();
      const nextAnswer =
        data.answer ?? data.message ?? data.response ?? data.text ?? data.finalAnswer;

      setAnswer(nextAnswer || localAnswer(cleanQuestion));
    } catch {
      setAnswer(localAnswer(cleanQuestion));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] font-sans">
      {open ? (
        <div className="border border-[#d1d5db] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-[#1f2937] px-3 py-2 text-white">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#cbd5e1]">
                Ask Tom
              </p>
              <p className="text-sm font-semibold">Fogo propensity agent</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-lg leading-none text-[#cbd5e1] hover:text-white"
              aria-label="Close Ask Tom"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 p-3">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="h-20 w-full resize-none border border-[#d1d5db] bg-white p-2 text-xs text-[#111827] outline-none focus:border-[#4e79a7]"
              placeholder="Ask about audiences, DMAs, HVC segments, or activation recommendations..."
            />

            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => ask(prompt)}
                  className="border border-[#e5e7eb] bg-[#f9fafb] px-2 py-1 text-[10px] text-[#4b5563] hover:border-[#4e79a7] hover:text-[#1f2937]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => ask()}
              disabled={loading}
              className="w-full bg-[#4e79a7] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Answering…" : "Ask Tom"}
            </button>

            <div className="min-h-24 border border-[#e5e7eb] bg-[#fafbfc] p-3 text-xs leading-5 text-[#374151]">
              {answer}
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto block bg-[#1f2937] px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-[#111827]"
        >
          Ask Tom · Propensity Agent
        </button>
      )}
    </div>
  );
}
