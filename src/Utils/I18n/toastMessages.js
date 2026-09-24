import { i18n } from "./i18n";

// Toasts WRITTEN BY THE FRONTEND (form checks such as "Enter an email or a
// phone number", "Saved", request timeouts...) have no backend `message`
// behind them, so x-api-lang can't translate them. Same approach as
// configFieldLabels.js: one flat English -> Portuguese table, applied once
// in notifications.jsx to every toast.
//
// A backend `message` is already in the caller's language, so it passes
// through untouched. Only an exact match on a string this app itself
// writes (or one of the patterns below) is ever replaced, so a backend
// message is never re-translated.
//
// Adding a new frontend toast: add its English text here with its
// Portuguese translation.
const PT = {
  // Customer onboarding (individual + corporate wizards/lists)
  "Enter an email or a phone number": "Informe um e-mail ou um número de telefone",
  "Choose the party type and ownership": "Escolha o tipo de parte e a titularidade",
  "Choose the party type and company type": "Escolha o tipo de parte e o tipo de empresa",
  "A reason is required to reject this": "É necessário um motivo para rejeitar",
  Saved: "Salvo",
  "Submitted for approval": "Enviado para aprovação",
  "Someone else updated this onboarding. Reloading the latest version.":
    "Outra pessoa atualizou esta integração. Recarregando a versão mais recente.",

  // Onboarding configuration / KYC schemes / masters
  "Draft saved": "Rascunho salvo",
  "Configuration is valid": "A configuração é válida",
  "Fix the listed problems before submitting": "Corrija os problemas listados antes de enviar",
  "Submitted for review": "Enviado para revisão",
  "Levels saved": "Níveis salvos",
  "Scheme is valid": "O esquema é válido",
  "Code and name are required": "Código e nome são obrigatórios",
  "A new code and name are required": "Um novo código e nome são obrigatórios",
  "Code, name and combination are required": "Código, nome e combinação são obrigatórios",
  "Code, name, party type and company type are required": "Código, nome, tipo de parte e tipo de empresa são obrigatórios",
  "Minor age (years) is required": "A idade de menoridade (anos) é obrigatória",
  "Colour must be a hex value like #C62828": "A cor deve ser um valor hexadecimal como #C62828",

  // Settings > Master
  "Name is required": "O nome é obrigatório",
  "Code is required": "O código é obrigatório",
  "Please select an ownership": "Selecione uma titularidade",
  "Please select a category": "Selecione uma categoria",
  "Account purpose name is required": "O nome da finalidade da conta é obrigatório",
  "Designation name is required": "O nome do cargo é obrigatório",
  "Disability name is required": "O nome da deficiência é obrigatório",
  "Employment name is required": "O nome do emprego é obrigatório",
  "Gender name is required": "O nome do gênero é obrigatório",
  "Occupation name is required": "O nome da ocupação é obrigatório",
  "Province name is required": "O nome da província é obrigatório",
  "Qualification name is required": "O nome da qualificação é obrigatório",
  "Religion name is required": "O nome da religião é obrigatório",
  "Source of fund name is required": "O nome da origem dos fundos é obrigatório",
  "Province and district name are required": "Província e nome do distrito são obrigatórios",
  "District and village name are required": "Distrito e nome da aldeia são obrigatórios",

  // Institution
  "Please select an institution": "Selecione uma instituição",
  "Please select a channel": "Selecione um canal",
  "Please select a currency": "Selecione uma moeda",
  "Please select a module": "Selecione um módulo",
  "Please select a module for every row": "Selecione um módulo para cada linha",

  // User management / profile
  "Please select a valid institution": "Selecione uma instituição válida",
  "Please select a valid institution and profile": "Selecione uma instituição e um perfil válidos",
  "Select at least one valid menu action": "Selecione pelo menos uma ação de menu válida",
  "The selected profile has an invalid identifier": "O perfil selecionado tem um identificador inválido",
  "The selected user has an invalid identifier": "O usuário selecionado tem um identificador inválido",
  "User ID, first name, and last name are required": "ID do usuário, nome e sobrenome são obrigatórios",
  "Policy name is required": "O nome da política é obrigatório",
  "All password fields are required": "Todos os campos de senha são obrigatórios",
  "New passwords do not match": "As novas senhas não coincidem",

  // Digital product
  "Save the Digital Product step before submitting": "Salve a etapa do Produto Digital antes de enviar",

  // Request plumbing (thrown by the service files, shown via error.message)
  "Session expired. Please sign in again.": "Sessão expirada. Faça login novamente.",
  "Request failed": "A solicitação falhou",
  "Request timed out": "A solicitação expirou",
  "Unexpected API error": "Erro inesperado da API",
  "Backend unavailable": "Servidor indisponível",
  "Failed to load audit history": "Falha ao carregar o histórico de auditoria",
  "Permission denied. You do not have access to this resource.": "Permissão negada. Você não tem acesso a este recurso.",
  "Method not allowed on this endpoint (405).": "Método não permitido neste endpoint (405).",
};

// Messages built with a variable part. The captured label was already
// translated at the call site (useConfigLabel's tr()), so it's reused as-is.
const PT_PATTERNS = [
  [/^Please select an? (.+)$/, (m) => `Selecione ${m[1]}`],
  [/^Please enter an? (.+)$/, (m) => `Informe ${m[1]}`],
  [/^Request failed with status (\d+)$/, (m) => `A solicitação falhou com o status ${m[1]}`],
  [/^Password does not meet policy: (.+)$/s, (m) => `A senha não atende à política: ${m[1]}`],
  [/^(.+) must be a valid hex color \(e\.g\. (#[0-9A-Fa-f]+)\)$/, (m) => `${m[1]} deve ser uma cor hexadecimal válida (ex.: ${m[2]})`],
];

export function translateToast(message) {
  if (typeof message !== "string" || !i18n.language?.toLowerCase().startsWith("pt")) return message;
  if (PT[message]) return PT[message];
  for (const [pattern, build] of PT_PATTERNS) {
    const match = message.match(pattern);
    if (match) return build(match);
  }
  return message;
}
