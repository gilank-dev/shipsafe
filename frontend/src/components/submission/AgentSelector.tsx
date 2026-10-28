import { AGENT_TARGETS } from '../../config/agents'
import { changeAgentTarget } from '../../state/audit-controller'
import { useStore } from '../../state/store'

export const AGENT_GROUP_ID = 'agent-selector'

export function AgentSelector() {
  const agentTarget = useStore((s) => s.submission.agentTarget)
  return (
    <fieldset id={AGENT_GROUP_ID} className="rule-top mt-4 min-w-0 pt-3">
      <legend className="float-left w-full text-title font-bold [font-stretch:112%]">Coding agent for prompts</legend>
      <p className="clear-both mt-1 text-small text-ink-2">Each finding gets a prompt written for the tool you pick.</p>
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {AGENT_TARGETS.map((agent) => (
          <label key={agent.id} className="check p-1.5 border border-rule/50 rounded-[var(--radius-control)] hover:border-ink/60 bg-surface/30">
            <input
              type="radio"
              name="agent-target"
              value={agent.id}
              checked={agentTarget === agent.id}
              onChange={() => void changeAgentTarget(agent.id)}
            />
            <span className="min-w-0">
              <span className="block font-semibold text-small leading-tight">{agent.label}</span>
              <span className="block text-caption text-ink-2 truncate">{agent.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
