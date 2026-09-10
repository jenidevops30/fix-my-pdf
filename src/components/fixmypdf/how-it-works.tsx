"use client";

export function HowItWorks() {
  const steps = [
    {
      title: "Upload",
      body: "Your file is opened in your own browser. Zero bytes are sent anywhere.",
    },
    {
      title: "Describe the fix",
      body: "A size limit, the pages you keep, or the portal's pasted rules.",
    },
    {
      title: "Download",
      body: "Every result is verified against the requirement before you get it.",
    },
  ];

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="scroll-mt-20 bg-card rounded-2xl border border-border p-8 sm:p-10"
    >
      <h2 className="text-2xl font-bold">How it works</h2>
      <div className="grid sm:grid-cols-3 gap-6 mt-6">
        {steps.map((step, i) => (
          <div key={step.title} className="space-y-2">
            <div className="size-8 rounded-lg bg-primary text-primary-foreground font-mono text-sm flex items-center justify-center">
              {i + 1}
            </div>
            <h3 className="font-bold text-sm">{step.title}</h3>
            <p className="text-xs text-muted-foreground">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
