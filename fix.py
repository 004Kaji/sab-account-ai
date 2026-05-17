p="src/app/(app)/invoice/page.tsx"
c=open(p).read()
old="email,phon\ne,address"
new2="email,phone,address"
c=c.replace(old,new2)
c=c.replace("true\n  })","true })")
open(p,"w").write(c)
print("done")
