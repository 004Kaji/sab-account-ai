p="src/app/(app)/invoice/page.tsx"
import re
c=open(p).read()
c=re.sub(r"phon\s*\ne\s*,address","phone,address",c)
open(p,"w").write(c)
print("done")
