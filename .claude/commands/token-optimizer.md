# Token Optimizer

Scan every Claude API call in this SAB Account AI codebase and produce a ranked list of token savings.

## Steps

1. **Find all Claude API calls**
   Run: `grep -rn "messages.create\|anthropic\." src/ --include="*.ts" --include="*.tsx" -l`
   Then read each file to locate the actual `system` prompt and `max_tokens` value.

2. **Audit each prompt for waste**
   For every system prompt found, check:
   - Repeated instructions that appear in multiple prompts (consolidate into a shared constant)
   - Verbose phrasing that could be cut without changing meaning
   - Examples or JSON schemas that are longer than needed
   - `max_tokens` set higher than the response ever actually uses
   - Model choice — is `claude-sonnet-4-6` used where `claude-haiku-4-5-20251001` would suffice?

3. **Estimate token counts**
   Rough rule: 1 token ≈ 4 characters. For each prompt, calculate:
   - Current character count → estimated tokens
   - Proposed shorter version → estimated tokens saved
   - Monthly saving at current usage volume (check `chat_usage` table or code comments for request estimates)

4. **Rank by impact**
   Sort findings by estimated monthly token saving (highest first).

5. **Output a report** in this format:

```
## Token Optimization Report — SAB Account AI

### 1. [File: src/lib/chat/tool-handlers.ts — BAS tool system prompt]
Current: ~2,400 tokens
Optimized: ~1,100 tokens  
Saving: ~1,300 tokens/call × estimated N calls/month = X tokens/month
Change: Remove repeated "You are an Australian accountant" phrasing that appears in 3 tool prompts. Extract to shared SYSTEM_IDENTITY constant.
Suggested prompt: [paste shortened version]

### 2. ...
```

6. **Quick wins** — flag any `max_tokens` values that are set to 4096 but the response is always under 300 tokens. Drop those to 512 to reduce cost on failed/timeout requests.

7. **Model downgrades** — list every call using `claude-sonnet-4-6` that only does classification, JSON extraction, or short formatting (< 100 token output). These are candidates for `claude-haiku-4-5-20251001` at ~20× lower cost.

Focus only on real savings. Do not suggest changes that would degrade response quality.
