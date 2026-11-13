"use client";

import {
  Award,
  BadgeCheck,
  Bot,
  BrainCircuit,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Code,
  Cloud,
  Database,
  Download,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Globe,
  GraduationCap,
  Layers,
  Mail,
  Microscope,
  PenLine,
  Quote,
  Star,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Badge, Button, Card, CardHeader, buttonClasses } from "@/components/ui";

const PROFILE = {
  name: "Gudepu Rakshitha Reddy",
  initials: "GR",
  headline:
    "Computer Science Engineer | AI/ML Enthusiast | Associate AI Forward Deployed Engineer",
  quote:
    "Building intelligent applications, developing practical AI solutions, and transforming ideas into real-world technology.",
  githubUrl: "https://github.com/GudepuRakshitha",
  linkedinUrl: "https://www.linkedin.com/in/gudepu-rakshitha-reddy-516aa72a9/",
  researchGateUrl: "https://www.researchgate.net/profile/Rakshitha-Reddy-Gudepu",
};

const ABOUT_PARAGRAPHS = [
  "I am a Computer Science Engineering graduate specializing in Artificial Intelligence and Machine Learning from Alliance University, Bengaluru, with a CGPA of 8.9/10.",
  "I am interested in building practical software applications using Java, Python, Artificial Intelligence, Machine Learning, Generative AI, and Agentic AI. I have experience in Java backend development, AI/ML projects, research, and software development.",
  "I enjoy solving real-world problems through technology and developing intelligent, user-focused applications.",
];

const EDUCATION = [
  {
    school: "Alliance University, Bengaluru",
    degree: "B.Tech – Computer Science and Engineering (AI/ML)",
    period: "September 2022 – May 2026",
    detail: "CGPA: 8.9/10",
  },
  {
    school: "Alphores Junior College",
    degree: "Intermediate",
    period: null,
    detail: "Percentage: 90%",
  },
];

const SKILL_CATEGORIES = [
  {
    title: "Programming Languages",
    icon: Code,
    items: ["Java", "Python", "SQL"],
  },
  {
    title: "Backend Development",
    icon: Layers,
    items: [
      "Java Spring Boot",
      "Hibernate",
      "REST APIs",
      "CRUD Operations",
      "JSON",
      "JUnit",
      "Maven",
    ],
  },
  {
    title: "AI and Machine Learning",
    icon: BrainCircuit,
    items: [
      "Artificial Intelligence",
      "Machine Learning",
      "Deep Learning",
      "Generative AI",
      "NLP",
      "Computer Vision",
      "CNN",
      "LSTM",
      "Transformers",
      "TensorFlow",
      "PyTorch",
      "Scikit-learn",
      "OpenCV",
    ],
  },
  {
    title: "Databases",
    icon: Database,
    items: ["MySQL", "Oracle"],
  },
  {
    title: "Tools and Platforms",
    icon: Cloud,
    items: ["Git and GitHub", "Docker", "Postman", "AWS", "Microsoft Azure"],
  },
];

const EXPERIENCE = [
  {
    org: "Anugraha",
    role: "Java Backend Developer Intern",
    points: [
      "Worked on HRMS modules.",
      "Developed backend REST APIs using Java and Spring Boot.",
      "Worked with MySQL, Maven, and GitLab.",
      "Contributed to backend development and application functionality.",
    ],
  },
  {
    org: "VETO Studios",
    role: "AI/ML Software Development Intern",
    points: [
      "Worked on speech recognition and text-to-speech applications.",
      "Used Python, Tkinter, and APIs.",
      "Explored predictive analytics and AI-based solutions.",
    ],
  },
  {
    org: "IIT Kharagpur",
    role: "Project Intern",
    points: [
      "Worked on a Smart Pill Dispenser project.",
      "Contributed to an academic technology project.",
    ],
  },
];

const PROJECTS = [
  {
    name: "GapFinder AI",
    tagline: "Personalized learning and knowledge gap detection",
    description:
      "AI-powered educational platform that helps identify what a student does not know, supports study material uploads, uses retrieval-augmented generation to build source-grounded diagnostic quizzes, identifies weak, medium and strong topics, creates personalized revision plans, and provides an AI tutor grounded in learning materials.",
    stack: ["AI / ML", "RAG", "Generative AI", "React"],
    featured: true,
  },
  {
    name: "Industrial Safety Monitoring System",
    tagline: "Alarm and incident monitoring for industrial operations",
    description:
      "Industrial alarm and incident monitoring with machine and plant safety monitoring, alarm acknowledgement tracking, incident management and safety analytics, plus a dashboard for monitoring operational performance.",
    stack: ["React", "Spring Boot", "MySQL"],
    featured: false,
  },
  {
    name: "AgriSense-AI",
    tagline: "AI-based agricultural intelligence",
    description:
      "AI-based agricultural intelligence platform combining crop images, weather, soil and historical information, using CNN/EfficientNet, LSTM and XGBoost with Grad-CAM and SHAP for explainability, built with React, Spring Boot and MySQL.",
    stack: ["React", "Spring Boot", "MySQL", "CNN", "LSTM", "XGBoost", "Grad-CAM", "SHAP"],
    featured: false,
  },
  {
    name: "Smart Pill Dispenser",
    tagline: "Smart medication dispensing",
    description:
      "Academic project focused on smart medication dispensing.",
    stack: ["Python", "IoT"],
    featured: false,
  },
];

const RESEARCH = [
  {
    title: "AgriSense-AI",
    area: "Multimodal AI for agricultural intelligence",
    venue: null,
    year: null,
    status: null,
    accuracy: null,
  },
  {
    title: "Cauliflower Leaf Disease Classification",
    area: "Computer vision · crop disease detection",
    venue: "IEEE-CIS",
    year: 2026,
    status: "Accepted",
    accuracy: "87%",
  },
  {
    title: "AI-Based Career Recommendation System",
    area: "AI · career guidance",
    venue: "IEEE",
    year: 2025,
    status: null,
    accuracy: "95%",
  },
  {
    title: "Deepfake Detection",
    area: "Deep learning · media forensics",
    venue: "Springer",
    year: 2024,
    status: null,
    accuracy: "91.67%",
  },
  {
    title: "Gemini 1.5-Based Text Summarization",
    area: "Generative AI · NLP",
    venue: "IEEE",
    year: 2026,
    status: null,
    accuracy: null,
  },
  {
    title: "Smart Attendance System",
    area: "Computer vision · real-time recognition",
    venue: null,
    year: 2024,
    status: null,
    accuracy: null,
  },
  {
    title: "Weather Prediction",
    area: "Predictive modelling",
    venue: "IEEE publication/document",
    year: null,
    status: null,
    accuracy: null,
  },
];

const SOCIAL_LINKS = [
  { label: "LinkedIn", url: PROFILE.linkedinUrl, icon: Users },
  { label: "GitHub", url: PROFILE.githubUrl, icon: GitBranch },
  { label: "ResearchGate", url: PROFILE.researchGateUrl, icon: Microscope },
  { label: "Blogger", url: "https://www.blogger.com/profile/08555579845123121571", icon: PenLine },
  { label: "Hugging Face", url: "https://huggingface.co/GudepuRakshithaReddy", icon: Bot },
  { label: "LeetCode", url: "https://leetcode.com/u/RakshithaReddy03/", icon: Code },
  { label: "HackerRank", url: "https://www.hackerrank.com/profile/rakshithareddy15", icon: Trophy },
];

export function AboutDeveloper() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <section
        id="top"
        className="animate-fade-in scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-900/[0.03] sm:p-8"
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-indigo-50 ring-1 ring-indigo-100 sm:h-28 sm:w-28">
            <span className="text-3xl font-bold tracking-tight text-indigo-700 sm:text-4xl">
              {PROFILE.initials}
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {PROFILE.name}
            </h1>
            <p className="mt-2 text-sm font-semibold text-indigo-700 sm:text-base">
              {PROFILE.headline}
            </p>
            <blockquote className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-left">
              <Quote className="h-4 w-4 text-indigo-400" />
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                &ldquo;{PROFILE.quote}&rdquo;
              </p>
            </blockquote>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <a href="#projects" className={buttonClasses("primary", "lg")}>
                <FolderGit2 className="h-4 w-4" /> View My Projects
              </a>
              <a href="#research" className={buttonClasses("secondary", "lg")}>
                <Microscope className="h-4 w-4" /> View Research
              </a>
              <a
                href={PROFILE.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "lg")}
              >
                <GitBranch className="h-4 w-4" /> GitHub
              </a>
              <a
                href={PROFILE.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary", "lg")}
              >
                <Users className="h-4 w-4" /> LinkedIn
              </a>
              <Button variant="soft" size="lg" disabled>
                <Download className="h-4 w-4" /> Download Resume
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Me */}
      <section id="about" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader icon={UserRound} title="About Me" />
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
            {ABOUT_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph.slice(0, 24)}>{paragraph}</p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand">Alliance University · CGPA 8.9/10</Badge>
            <Badge tone="neutral">Alphores Junior College · Intermediate 90%</Badge>
          </div>
        </Card>
      </section>

      {/* Education */}
      <section id="education" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader icon={GraduationCap} title="Education" />
          <ol className="relative mt-4 space-y-6 border-l border-slate-200 pl-6">
            {EDUCATION.map((item) => (
              <li key={item.school} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                <h3 className="text-sm font-semibold text-slate-900">{item.school}</h3>
                <p className="mt-0.5 text-xs font-medium text-indigo-700">{item.degree}</p>
                {item.period ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <CalendarDays className="h-3 w-3" /> {item.period}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] font-semibold text-slate-700">{item.detail}</p>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* Technical Skills */}
      <section id="skills" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={BrainCircuit}
            title="Technical Skills"
            description="Languages, backend, AI/ML, data and platforms."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SKILL_CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="text-xs font-semibold text-slate-800">{category.title}</h3>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {category.items.map((item) => (
                      <Badge key={item} tone="neutral">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* Professional Experience */}
      <section id="experience" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={Briefcase}
            title="Professional Experience"
            description="Backend, AI/ML and academic engineering internships."
          />
          <ol className="relative mt-4 space-y-6 border-l border-slate-200 pl-6">
            {EXPERIENCE.map((item) => (
              <li key={item.org} className="relative">
                <span className="absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-50" />
                <h3 className="text-sm font-semibold text-slate-900">{item.org}</h3>
                <p className="mt-0.5 text-xs font-medium text-indigo-700">{item.role}</p>
                <div className="mt-2 space-y-1.5">
                  {item.points.map((point) => (
                    <p
                      key={point}
                      className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-600"
                    >
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{point}</span>
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {/* Featured Projects */}
      <section id="projects" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={FolderGit2}
            title="Featured Projects"
            description="Things I have designed and built."
          />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {PROJECTS.map((project) => (
              <article
                key={project.name}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <FolderGit2 className="h-4 w-4" />
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900">{project.name}</h3>
                  </div>
                  {project.featured ? (
                    <Badge tone="brand" icon={Star}>
                      Featured
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] font-medium text-indigo-600">{project.tagline}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  {project.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {project.stack.map((technology) => (
                    <Badge key={technology} tone="neutral">
                      {technology}
                    </Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            More projects coming soon — this portfolio will keep growing as new work ships.
          </p>
        </Card>
      </section>

      {/* Research Publications */}
      <section id="research" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={Microscope}
            title="Research Publications"
            description="Selected research areas and publications."
          />
          <ul className="mt-4 space-y-3">
            {RESEARCH.map((publication) => (
              <li
                key={publication.title}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{publication.title}</h3>
                  {publication.status ? (
                    <Badge tone="success" icon={BadgeCheck}>
                      {publication.status}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-[11px] text-slate-600">{publication.area}</p>
                <p className="mt-0.5 text-[11px] font-medium text-indigo-700">
                  {[publication.venue, publication.year]
                    .filter((part) => part !== null && part !== undefined)
                    .join(" · ")}
                </p>
                {publication.accuracy ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Reported accuracy: {publication.accuracy}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
          <a
            href={PROFILE.researchGateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses("secondary", "md")}
          >
            <ExternalLink className="h-4 w-4" /> View full profile on ResearchGate
          </a>
        </Card>
      </section>

      {/* Certifications */}
      <section id="certifications" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={Award}
            title="Certifications & Achievements"
            description="Verified credentials and learning milestones."
          />
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Award className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Microsoft Azure AI Fundamentals
                  </h3>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Microsoft · Azure AI Fundamentals
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">100+ Technical Certifications</h3>
                  <p className="mt-0.5 text-[11px] text-slate-600">
                    AI/ML learning and technical achievements across platforms and tools.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Professional Profiles */}
      <section id="profiles" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={Globe}
            title="Professional Profiles"
            description="Find me across the web and professional networks."
          />
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOCIAL_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-slate-900">
                        {link.label}
                      </span>
                      <span className="block truncate text-[10px] text-slate-500">
                        {link.url.replace("https://", "").replace("http://", "")}
                      </span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-indigo-500" />
                  </a>
                </li>
              );
            })}
          </ul>
        </Card>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24">
        <Card className="p-5">
          <CardHeader
            icon={Mail}
            title="Contact"
            description="Prefer a direct note? Reach out through any of these professional channels."
          />
          <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
            No personal email address is published here. Connecting through LinkedIn, GitHub,
            ResearchGate or Blogger is the preferred way to get in touch.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={PROFILE.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              <Users className="h-4 w-4" /> LinkedIn
            </a>
            <a
              href={PROFILE.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              <GitBranch className="h-4 w-4" /> GitHub
            </a>
            <a
              href={PROFILE.researchGateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              <Microscope className="h-4 w-4" /> ResearchGate
            </a>
            <a
              href="https://www.blogger.com/profile/08555579845123121571"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses("secondary", "md")}
            >
              <PenLine className="h-4 w-4" /> Blogger
            </a>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-sm shadow-slate-900/[0.03] sm:p-8">
        <p className="text-sm font-semibold text-slate-900">
          Designed and Developed by Gudepu Rakshitha Reddy
        </p>
        <p className="mt-1 text-[11px] text-slate-500">© 2026 All Rights Reserved.</p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <a
            href={PROFILE.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <Users className="h-4 w-4" />
          </a>
          <a
            href={PROFILE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub profile"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600"
          >
            <GitBranch className="h-4 w-4" />
          </a>
        </div>
      </footer>
    </div>
  );
}
