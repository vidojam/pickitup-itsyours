import { LEGAL_DISCLAIMER } from "@/lib/constants";

export function TermsBox() {
  return (
    <section className="rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm leading-6">
      <h2 className="mb-2 text-base font-semibold">Terms of Use & Disclaimer</h2>
      <p className="whitespace-pre-line">{LEGAL_DISCLAIMER}</p>
    </section>
  );
}
