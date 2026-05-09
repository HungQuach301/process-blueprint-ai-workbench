# AI Template Review Design

## 1. Why templates can be wrong

Template có thể sai hoặc không phù hợp dù Process Task Register đúng. Lý do chính là template không chỉ là giao diện, mà còn chứa giả định về output, notation, lane, row, card, connector và mandatory fields.

Các nhóm lỗi thường gặp:

- Template không phù hợp với output type, ví dụ dùng service blueprint rules cho BPMN.
- Template không phù hợp business domain, ví dụ template generic dùng cho lending process có nhiều control.
- Lane rules thiếu actor/system quan trọng.
- Row rules không phản ánh đúng customer journey hoặc internal workflow.
- Mandatory fields quá ít, khiến artifact thiếu traceability.
- Mandatory fields quá nhiều, làm user khó nhập và QA quá nhiễu.
- Connector rules tạo diagram khó đọc hoặc thiếu flow quan trọng.
- Layout rules không phù hợp process dài.
- Color/card rules không giúp phân biệt event, gateway, task, data/control.
- Template metadata thiếu processType, journeyType, scopeType hoặc notationStandard.

AI Template Review cần phát hiện lỗi template fit, nhưng không được tự sửa generator. Nếu cần sửa, output phải là recommendation để người dùng review.

## 2. BPMN template checks

BPMN template checks tập trung vào D01 BPMN output và TemplateProfile loại BPMN.

Các check quan trọng:

- `outputType` nên là `BPMN`.
- `notationStandard` nên là `BPMN 2.0`.
- `type` nên là `bpmn`.
- Mandatory fields nên bao gồm các field nền: `id`, `stepId`, `rowType`, `bpmnType`, `taskName`, `reviewStatus`.
- Nếu template dùng actor/system lanes, nên có `actor`, `actorLane`, `system`, `systemLane`.
- Lane rules nên bao phủ các actor/system chính trong Process Task Register.
- Connector rules nên phân biệt default flow và conditional flow.
- Gateway rules nên hỗ trợ `conditionQuestion`, `yesNextStep`, `noNextStep`.
- Data linkage nên bảo toàn `dataObject`, `dataAction`, `input`, `output`.
- Risk/control và SLA nên có chỗ hiển thị hoặc ít nhất giữ traceability.
- Layout rules nên phù hợp với process có nhiều task, tránh diagram quá rộng nếu có thể.

AI Template Review có thể phân loại issue:

- Metadata mismatch.
- Missing mandatory field.
- Lane coverage gap.
- Gateway support gap.
- Data traceability gap.
- Layout risk.
- BPMN notation mismatch.

## 3. Service Blueprint template checks

Service Blueprint template checks tập trung vào D02 draw.io output và TemplateProfile loại Service Blueprint.

Các check quan trọng:

- `outputType` nên là `Service Blueprint`.
- `notationStandard` nên là `Service Blueprint`.
- `type` nên là `serviceBlueprint`.
- Row rules nên có các layer service blueprint cần thiết:
  - STEPS
  - PHASE
  - TIME
  - EVIDENCE
  - CUSTOMER ACTIONS
  - FRONT-STAGE INTERACTIONS - PEOPLE
  - FRONT-STAGE INTERACTIONS - SYSTEM / CHANNEL
  - BACK-STAGE INTERACTIONS - PEOPLE
  - BACK-STAGE INTERACTIONS - SYSTEM / TOOLS
  - SUPPORT PROCESSES
  - DATA / CONTROL
  - OUTCOME / END STATE
- Task card rules nên giữ mô hình 3 joined boxes:
  - Header = actor
  - Middle = task name + BPMN type + task nature
  - Footer = system/app
- Mandatory fields nên bao gồm actor, system, taskName, input/output hoặc field tương đương để card có ý nghĩa.
- Connector rules nên tránh duplicate connector.
- Layout rules nên hỗ trợ dynamic row height và phase width.
- Color rules nên giúp phân biệt customer/front-stage/back-stage/support/data.
- Template nên hỗ trợ customerInteractionType và channel.

AI Template Review cần đặc biệt chú ý template không được merge nhiều ProcessTask thành một card, vì D02 rule yêu cầu một ProcessTask là một card.

## 4. Template quality score

Template quality score là điểm đánh giá mức độ sẵn sàng của template. Score không nên là quyết định tuyệt đối, mà là tín hiệu hỗ trợ review.

Gợi ý thang điểm 0-100:

- Metadata fit: 15 điểm
- Mandatory field coverage: 15 điểm
- Lane/row coverage: 20 điểm
- Connector quality: 15 điểm
- Card/notation clarity: 15 điểm
- Layout readiness: 10 điểm
- Governance/readability: 10 điểm

Các mức diễn giải:

- 90-100: Ready
- 75-89: Good with minor review
- 60-74: Needs review
- 40-59: High risk
- 0-39: Not recommended

Score nên đi kèm reason cụ thể. Không nên chỉ hiển thị số điểm mà không có explanation.

## 5. Template recommendation schema

Template recommendation nên là schema riêng, tách với `QARecommendation` vì mục tiêu là sửa hoặc review `TemplateProfile`, không sửa Process Task Register.

Schema đề xuất:

```ts
type TemplateRecommendation = {
  id: string;
  templateId: string;
  type:
    | "UpdateMetadata"
    | "UpdateRules"
    | "AddMandatoryField"
    | "ImproveTemplateFit"
    | "MarkForReview";
  title: string;
  description: string;
  confidence: "low" | "medium" | "high";
  riskLevel: "low" | "medium" | "high";
  patch?: Partial<TemplateProfile>;
  warnings?: string[];
  affectedFields: Array<keyof TemplateProfile>;
  requiresConfirmation: boolean;
};
```

Response schema:

```ts
type AITemplateReviewResponse = {
  recommendations: TemplateRecommendation[];
  meta: AIOrchestrationResponseMeta;
};
```

Ví dụ recommendation:

```ts
{
  id: "template-d02-add-customer-row",
  templateId: "template-service-blueprint-sme-online-loan",
  type: "UpdateRules",
  title: "Bổ sung row Front-stage System",
  description: "Template D02 cần row cho system/channel tương tác trực tiếp với khách hàng.",
  confidence: "high",
  riskLevel: "low",
  affectedFields: ["rowRules"],
  requiresConfirmation: true
}
```

## 6. Human approval

Template recommendation phải có human approval trước khi apply.

Workflow:

1. AI hoặc rule review tạo recommendation.
2. UI hiển thị template hiện tại, proposed patch, affected fields và warning.
3. Người dùng accept, reject hoặc edit.
4. Khi accept, TemplateProfile draft được cập nhật.
5. Người dùng bấm save để persist vào localStorage/backend.
6. D01/D02 generated artifact được đánh dấu stale.
7. Artifact cần generate lại để kiểm tra template mới.

Các thay đổi cần review kỹ:

- Thay đổi `type`, `outputType`, `notationStandard`.
- Thay đổi rowRules/laneRules.
- Thay đổi connectorRules.
- Thay đổi mandatoryFields.
- Thay đổi layoutRules ảnh hưởng toàn bộ artifact.

Không nên auto-apply template recommendation, kể cả recommendation risk thấp.

## 7. Enterprise governance

Trong môi trường enterprise, template là tài sản quản trị, không chỉ là cấu hình UI.

Governance nên bao gồm:

- Template owner.
- Version.
- Status: draft, active, archived.
- Change log.
- Approval history.
- Domain/process type classification.
- Organization type.
- Notation standard.
- Audit log cho mọi thay đổi.
- Export/import template profile.
- Rollback về version trước.

Với ngân hàng, template có thể gắn với quy định nội bộ, audit requirement và model governance. Do đó template review cần minh bạch:

- AI chỉ đề xuất.
- Người dùng hoặc governance role phê duyệt.
- Mọi thay đổi phải trace được.
- Không trộn template của tổ chức này sang tổ chức khác nếu chưa được phép.

## 8. Local/BYOK data considerations

### Local-only

Template review có thể chạy local bằng rule checks và mock AI. Đây là chế độ an toàn nhất vì TemplateProfile có thể chứa thông tin nội bộ về process design.

### BYOK

BYOK cho phép tổ chức dùng provider riêng. Trước khi gửi TemplateProfile ra ngoài, cần xác định:

- Template có chứa tên hệ thống nội bộ không.
- Row/lane rules có tiết lộ operating model không.
- Mandatory fields có tiết lộ control framework không.
- Provider có no-training không.
- Audit log có ghi request/provider/data mode không.

### Enterprise provider

Enterprise provider phù hợp khi tổ chức muốn review template bằng model nội bộ hoặc private endpoint. Cần tenant isolation, no-training, policy enforcement và audit.

### No-AI

No-AI mode vẫn có thể chạy rule-based template checks:

- Missing metadata.
- Missing mandatory fields.
- Type/outputType mismatch.
- Missing standard D02 rows.
- Invalid JSON rule object.

No-AI mode cần được giữ như fallback cho môi trường chưa phê duyệt AI.

## 9. Independent trainable skill/agent

Template Review Engine có thể hoạt động như một skill/agent độc lập với Recommendation Engine sửa Process Task Register.

### Skill boundary

Input:

- TemplateProfile.
- Template classification metadata.
- ProcessTask[] nếu cần đánh giá template fit.
- D01/D02 artifact nếu cần review output.
- User feedback về template.

Output:

- TemplateRecommendation[].
- Template quality score.
- Warnings.
- Assumptions.

Skill không được:

- Apply template patch trực tiếp.
- Sửa D01/D02 generator.
- Sửa Process Task Register.
- Gửi dữ liệu ra ngoài khi data mode không cho phép.

### Training data

Template Review skill có thể học từ:

- Template được chọn cho D01/D02.
- Template recommendation accepted/rejected.
- User edits trong Template Library.
- Artifact generation result.
- QA issue còn lại sau khi dùng template.
- Domain/process type của workspace.
- Feedback rating của người dùng.

### Evaluation metrics

Metric gợi ý:

- Template recommendation acceptance rate.
- Reduction in template-related QA issues.
- Artifact readability score.
- D02 overlap/layout issue reduction.
- BPMN viewer/modeler compatibility.
- User edit distance sau recommendation.

### Deployment model

Skill có thể triển khai theo các mức:

- Local rule-based template reviewer.
- Mock AI reviewer cho MVP.
- BYOK AI reviewer.
- Enterprise-hosted template review agent.
- Organization-private trained template skill.

Template Review skill nên được train độc lập vì nó học cách đánh giá TemplateProfile và artifact fit, khác với Recommendation skill học cách sửa ProcessTask. Tách riêng giúp governance rõ hơn và giảm rủi ro học sai từ feedback không cùng mục tiêu.
