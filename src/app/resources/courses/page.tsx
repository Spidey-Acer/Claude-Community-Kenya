import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Reveal } from "@/components/karibu/motion/Reveal";
import { GuideBlock } from "@/components/karibu/GuideBlock";

export const metadata: Metadata = {
  title: "Courses & Learning Paths | Claude Community Kenya",
  description:
    "Free structured courses from Anthropic covering API fundamentals, prompt engineering, real-world prompting, evaluations, and tool use.",
  alternates: {
    canonical: "https://www.claudekenya.org/resources/courses",
  },
  openGraph: {
    title: "Courses & Learning Paths | Claude Community Kenya",
    description:
      "Free structured courses from Anthropic covering API fundamentals, prompt engineering, real-world prompting, evaluations, and tool use.",
    url: "https://www.claudekenya.org/resources/courses",
    siteName: "Claude Community Kenya",
    type: "website",
  },
};

const courses = [
  {
    number: 1,
    title: "Anthropic API Fundamentals",
    description:
      "The essentials of working with the Claude SDK. Learn how to get an API key, understand the messages format, explore the Claude model family, configure model parameters, stream responses, and work with vision/multimodal prompting.",
    format: "6 Jupyter notebooks",
    prereqs: "Python basics, an Anthropic API key",
    topics: [
      "Getting started & API key setup",
      "Messages format",
      "Claude model family",
      "Model parameters (temperature, max_tokens, etc.)",
      "Streaming responses",
      "Vision & multimodal prompting",
    ],
    url: "https://github.com/anthropics/courses/tree/master/anthropic_api_fundamentals",
  },
  {
    number: 2,
    title: "Prompt Engineering Interactive Tutorial",
    description:
      "A comprehensive 9-chapter guide to prompt engineering, from basic structure through advanced techniques. Covers role prompting, separating data from instructions, formatting output, chain-of-thought reasoning, few-shot examples, and avoiding hallucinations.",
    format: "13 Jupyter notebooks (Anthropic API + AWS Bedrock versions)",
    prereqs: "Course 1 or basic API familiarity",
    topics: [
      "Basic prompt structure & being clear",
      "Assigning roles to Claude",
      "Separating data from instructions",
      "Formatting output (JSON, XML, markdown)",
      "Chain-of-thought reasoning",
      "Few-shot examples",
      "Avoiding hallucinations",
      "Complex prompts from scratch",
    ],
    url: "https://github.com/anthropics/courses/tree/master/prompt_engineering_interactive_tutorial",
  },
  {
    number: 3,
    title: "Real World Prompting",
    description:
      "Apply prompting techniques to complex, real-world domains. Work through medical, customer support, and call summarization use cases using the iterative prompt engineering process.",
    format: "5 Jupyter notebooks",
    prereqs: "Course 2 (Prompt Engineering Tutorial)",
    topics: [
      "Prompting technique recap",
      "Medical domain prompts",
      "Iterative prompt engineering process",
      "Call summarization",
      "Customer support AI",
    ],
    url: "https://github.com/anthropics/courses/tree/master/real_world_prompting",
  },
  {
    number: 4,
    title: "Prompt Evaluations",
    description:
      "Learn how to measure and evaluate prompt quality in production. Covers human-graded evals, code-graded evals, classification evaluations, and integration with the promptfoo evaluation framework.",
    format: "9 lesson folders with notebooks, configs, and test data",
    prereqs: "Courses 1-3, Node.js (for promptfoo lessons)",
    topics: [
      "Introduction to evaluations",
      "Human-graded evals (Workbench)",
      "Code-graded evaluations",
      "Classification evaluations",
      "promptfoo framework integration",
      "Custom grader functions",
      "Model-as-judge evaluations",
    ],
    url: "https://github.com/anthropics/courses/tree/master/prompt_evaluations",
  },
  {
    number: 5,
    title: "Tool Use (Function Calling)",
    description:
      "Everything you need to implement tool use successfully. Learn how Claude calls external functions, how to structure tool definitions, control tool choice, and build multi-tool chatbots.",
    format: "6 Jupyter notebooks",
    prereqs: "Course 1 or basic API familiarity",
    topics: [
      "Tool use overview & architecture",
      "Building your first tool",
      "Structured outputs via tool use",
      "Complete request/response workflow",
      "Controlling tool choice",
      "Multi-tool chatbot",
    ],
    url: "https://github.com/anthropics/courses/tree/master/tool_use",
  },
];

export default function CoursesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-20">
      {/* Back link */}
      <Link
        href="/resources"
        className="inline-flex items-center gap-2 font-mono text-sm text-ink-muted transition-colors hover:text-clay"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Resources
      </Link>

      {/* Header */}
      <section className="py-16">
        <h1 className="mb-4 max-w-[820px] font-newsreader text-[38px] font-normal leading-[1.06] tracking-[-0.02em] text-ink sm:text-[48px]">Learning Paths</h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-soft">Free structured courses from Anthropic. Complete them in order for the best learning experience — or jump to the topic you need.</p>
        <div className="mt-6 border border-sand bg-paper-card p-4">
          <p className="font-mono text-sm text-clay-dark">REQUIREMENTS:</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-soft">
            <li>
              <span className="font-mono text-clay">PYTHON</span> —
              Basic Python knowledge
            </li>
            <li>
              <span className="font-mono text-clay">API_KEY</span> —
              An Anthropic API key (
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-soft hover:underline"
              >
                get one here
              </a>
              )
            </li>
            <li>
              <span className="font-mono text-clay">JUPYTER</span> —
              Jupyter Notebook or Google Colab
            </li>
          </ul>
        </div>
      </section>

      {/* Course List */}
      <section className="space-y-8">
        {courses.map((course) => (
          <Reveal key={course.number}>
            <GuideBlock
              title={`course-${course.number}.md`}
              variant="default"
            >
              <div className="space-y-4">
                {/* Course header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="font-mono text-xs text-ink-muted">
                      COURSE {course.number} OF 5
                    </span>
                    <h2 className="mt-1 font-mono text-lg font-bold text-clay-dark">
                      {course.title}
                    </h2>
                  </div>
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1.5 border border-clay px-3 py-1.5 font-mono text-xs text-clay transition-all duration-200 hover:bg-clay hover:text-paper-card"
                  >
                    START
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* Description */}
                <p className="text-sm text-ink-soft leading-relaxed">
                  {course.description}
                </p>

                {/* Meta */}
                <div className="flex flex-wrap gap-4 text-xs text-ink-muted">
                  <span>
                    <span className="font-mono text-clay">FORMAT</span>{" "}
                    {course.format}
                  </span>
                  <span>
                    <span className="font-mono text-clay">
                      PREREQS
                    </span>{" "}
                    {course.prereqs}
                  </span>
                </div>

                {/* Topics */}
                <div className="border-t border-sand pt-3">
                  <p className="mb-2 font-mono text-xs text-ink-soft">
                    TOPICS COVERED:
                  </p>
                  <ul className="grid grid-cols-1 gap-1 text-sm text-ink-soft sm:grid-cols-2">
                    {course.topics.map((topic) => (
                      <li key={topic} className="flex items-start gap-2">
                        <span className="mt-0.5 text-clay">
                          &gt;
                        </span>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </GuideBlock>
          </Reveal>
        ))}
      </section>

      {/* Bottom CTA */}
      <Reveal index={1}>
        <section className="mt-16 border border-sand bg-paper-card p-8 text-center">
          <p className="font-mono text-sm text-clay-dark">ALL COURSES ARE FREE</p>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-soft">
            These courses are maintained by Anthropic and hosted on GitHub. They
            use Claude 3 Haiku by default to keep API costs low, but you can use
            any Claude model. Run the notebooks locally or on Google Colab.
          </p>
          <a
            href="https://github.com/anthropics/courses"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 border border-clay px-5 py-2.5 font-mono text-sm font-medium text-clay transition-all duration-200 hover:bg-clay hover:text-paper-card"
          >
            <span aria-hidden="true">&gt;</span>
            VIEW_ALL_ON_GITHUB
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </Reveal>
    </main>
  );
}
