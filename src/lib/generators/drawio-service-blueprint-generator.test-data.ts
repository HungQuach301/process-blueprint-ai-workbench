import { generateServiceBlueprintDrawioXml } from "@/lib/generators/drawio-service-blueprint-generator";
import {
  sampleProcessTasks,
  sampleServiceBlueprintTemplateProfile
} from "@/lib/sample-data/sme-online-loan";

export function generateSampleServiceBlueprintDrawioXml() {
  return generateServiceBlueprintDrawioXml(
    sampleProcessTasks,
    sampleServiceBlueprintTemplateProfile
  );
}
