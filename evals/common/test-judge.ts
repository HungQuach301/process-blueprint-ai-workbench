import * as fs from "fs";
import * as path from "path";
import { runJudge, JUDGE_VERSION } from "./judge.js";

const rubricPath = path.resolve(
  __dirname,
  "../../evals/datasets/input-brief-to-ptr/v1/rubric.md"
);
const datasetPath = path.resolve(
  __dirname,
  "../../evals/datasets/input-brief-to-ptr/v1/dataset.json"
);

const rubricMarkdown = fs.readFileSync(rubricPath, "utf-8");
const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8")) as Array<{
  input: unknown;
}>;
const evalInput = dataset[0].input;

const goodOutput = {
  draftProcessTasks: [
    {
      stepId: "S010",
      taskName: "Khach hang gui nhu cau vay",
      bpmnType: "startEvent",
      rowType: "start",
      actor: "Khach hang",
      actorLane: "Khach hang",
      system: "",
      systemLane: "",
      taskNature: "manual",
      input: "Nhu cau vay von",
      output: "Ho so vay dau vao",
      conditionQuestion: "",
      riskControl: "",
      sla: "",
      dataAction: "create",
    },
    {
      stepId: "S020",
      taskName: "RM tiep nhan va kiem tra so bo ho so",
      bpmnType: "userTask",
      rowType: "task",
      actor: "RM",
      actorLane: "RM",
      system: "CRM",
      systemLane: "CRM",
      taskNature: "manual",
      input: "Ho so vay dau vao",
      output: "Ho so da kiem tra so bo",
      conditionQuestion: "",
      riskControl: "Kiem tra danh sach den",
      sla: "1 ngay lam viec",
      dataAction: "validate",
    },
    {
      stepId: "S030",
      taskName: "Credit Officer tham dinh tin dung",
      bpmnType: "userTask",
      rowType: "task",
      actor: "Credit Officer",
      actorLane: "Credit Officer",
      system: "LOS",
      systemLane: "LOS",
      taskNature: "manual",
      input: "Ho so da kiem tra so bo",
      output: "Bao cao tham dinh tin dung",
      conditionQuestion: "",
      riskControl: "Phan tich rui ro tin dung theo quy trinh KYC",
      sla: "3 ngay lam viec",
      dataAction: "validate",
    },
    {
      stepId: "G040",
      taskName: "Phe duyet hay tu choi?",
      bpmnType: "exclusiveGateway",
      rowType: "gateway",
      actor: "Credit Officer",
      actorLane: "Credit Officer",
      system: "",
      systemLane: "",
      taskNature: "manual",
      input: "Bao cao tham dinh",
      output: "Quyet dinh phe duyet",
      conditionQuestion: "Khoan vay co du dieu kien phe duyet khong?",
      riskControl: "",
      sla: "",
      dataAction: "none",
    },
    {
      stepId: "S050",
      taskName: "Ops Support giai ngan",
      bpmnType: "serviceTask",
      rowType: "task",
      actor: "Ops Support",
      actorLane: "Ops Support",
      system: "Core Banking",
      systemLane: "Core Banking",
      taskNature: "automatic",
      input: "Quyet dinh phe duyet",
      output: "Bien lai giai ngan",
      conditionQuestion: "",
      riskControl: "Xac nhan giai ngan 4 mat",
      sla: "1 ngay lam viec",
      dataAction: "create",
    },
    {
      stepId: "S090",
      taskName: "Ket thuc quy trinh",
      bpmnType: "endEvent",
      rowType: "end",
      actor: "",
      actorLane: "",
      system: "",
      systemLane: "",
      taskNature: "manual",
      input: "Bien lai giai ngan hoac thong bao tu choi",
      output: "Ho so hoan tat",
      conditionQuestion: "",
      riskControl: "",
      sla: "",
      dataAction: "none",
    },
  ],
  confidence: "medium",
  notes:
    "PTR duoc tao tu brief co day du actor va system. Mot so chi tiet SLA va rui ro con can xac nhan.",
};

const badOutput = {
  draftProcessTasks: [
    {
      stepId: "S010",
      taskName: "Nhan ho so",
      bpmnType: "userTask",
      rowType: "task",
      actor: "",
      actorLane: "",
      system: "",
      systemLane: "",
      taskNature: "manual",
      input: "",
      output: "",
      conditionQuestion: "",
      riskControl: "",
      sla: "",
      dataAction: "none",
    },
  ],
  confidence: "high",
  notes: "",
};

async function main() {
  const model = process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001";

  console.log(`judgeVersion: ${JUDGE_VERSION}`);
  console.log(`model: ${model}`);

  const goodResult = await runJudge({
    rubricMarkdown,
    input: evalInput,
    output: goodOutput,
  });

  const badResult = await runJudge({
    rubricMarkdown,
    input: evalInput,
    output: badOutput,
  });

  console.log("\n=== GOOD output ===");
  console.log(JSON.stringify(goodResult, null, 2));

  console.log("\n=== BAD output ===");
  console.log(JSON.stringify(badResult, null, 2));

  console.log(`\nGOOD overall: ${goodResult.overall} (${goodResult.verdict})`);
  console.log(`BAD  overall: ${badResult.overall} (${badResult.verdict})`);
  console.log(`GOOD > BAD: ${goodResult.overall > badResult.overall}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
