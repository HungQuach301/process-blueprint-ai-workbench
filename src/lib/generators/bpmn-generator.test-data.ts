import { generateBpmnXml } from "@/lib/generators/bpmn-generator";
import {
  sampleBpmnTemplateProfile,
  sampleProcessTasks
} from "@/lib/sample-data/sme-online-loan";

export function generateSampleBpmnXml() {
  return generateBpmnXml(sampleProcessTasks, sampleBpmnTemplateProfile);
}
