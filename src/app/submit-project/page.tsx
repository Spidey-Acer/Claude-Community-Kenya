import { BreadcrumbSchema } from "@/components/schema/BreadcrumbSchema";
import { KaribuSubmitProject } from "@/components/karibu/KaribuSubmitProject";

export default function SubmitProjectPage() {
  return (
    <>
      <BreadcrumbSchema items={[{ name: "Home", url: "/" }, { name: "Submit a Project" }]} />
      <KaribuSubmitProject />
    </>
  );
}
