import type { Metadata } from "next";
import { AboutDeveloper } from "@/components/portfolio/AboutDeveloper";

export const metadata: Metadata = {
  title: "About the Developer",
  description:
    "Portfolio of Gudepu Rakshitha Reddy — Computer Science Engineer, AI/ML enthusiast and Associate AI Forward Deployed Engineer.",
};

export default function AboutPage() {
  return <AboutDeveloper />;
}
