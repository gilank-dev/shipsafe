import { AGENT_TARGETS } from '../../config/agents'
import { changeAgentTarget } from '../../state/audit-controller'
import { useStore } from '../../state/store'

export const AGENT_GROUP_ID = 'agent-selector'

export function AgentSelector() {
  const agentTarget = useStore((s) => s.submission.agentTarget)
  return (
    <fieldset id={AGENT_GROUP_ID} className="rule-top mt-8 min-w-0 pt-4">
      <legend className="float-left w-full text-title font-bold [font-stretch:112%]">Coding agent for prompts</legend>
      <p className="clear-both mt-1 text-small text-ink-2">Each finding gets a prompt written for the tool you pick.</p>
      <div className="mt-2">
        {AGENT_TARGETS.map((agent) => (
          <label key={agent.id} className="check">
            <input
              type="radio"
              name="agent-target"
              value={agent.id}
              checked={agentTarget === agent.id}
              onChange={() => void changeAgentTarget(agent.id)}
            />
            <span>
              <span className="block font-semibold">{agent.label}</span>
              <span className="block text-small text-ink-2">{agent.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
