import json, pathlib, hashlib
log=pathlib.Path('/home/terrizoaguimor/.codex/sessions/2026/10/18/rollout-2026-10-18T19-27-41-01a1518e-965c-78a2-bac3-6cfafae464b7.jsonl')
calls={}; matches=[]
for line in log.open():
 row=json.loads(line); p=row.get('payload',{})
 if p.get('type')=='function_call': calls[p['call_id']]=p
 if p.get('type')!='function_call_output' or p['call_id'] not in calls: continue
 call=calls[p['call_id']]
 if not call.get('name','').endswith('_use_figma'): continue
 output=p.get('output',''); text=output if isinstance(output,str) else '\n'.join(x.get('text','') for x in output if isinstance(x,dict))
 marker=text.find('{"status":"refined"')
 if marker<0: continue
 result,_=json.JSONDecoder().raw_decode(text[marker:]); args=json.loads(call['arguments'])
 matches.append((args,result,p['call_id']))
base=pathlib.Path('.figma/proofs/appearance-views-1.1'); base.mkdir(parents=True,exist_ok=True)
for args,result,callid in matches:
 view=result['view']; code=args['code']; expected=pathlib.Path(f'/tmp/aureform-ui-integration-Y0Rdcz/native-lease-ready/{view}-refine-1.1.min.js').read_text()
 if code!=expected: raise RuntimeError('Executed payload mismatch '+view)
 pack=result['affectedNodeIds']; prefixes=[]; previous=''
 for line in pack['prefixesFrontCodedCSV'].splitlines():
  n,suffix=line.split(',',1); previous=previous[:int(n)]+suffix; prefixes.append(previous)
 decoded={'createdNodeIds':set(),'mutatedNodeIds':set(),'removedNodeIds':set()}
 def add(mask,nodeid):
  for bit,key in [(1,'createdNodeIds'),(2,'mutatedNodeIds'),(4,'removedNodeIds')]:
   if mask&bit: decoded[key].add(nodeid)
 for row in pack['rangesCSV'].splitlines():
  mask,idx,ranges=row.split(',',2)
  for run in ranges.split(';'):
   bounds=run.split('-'); first=int(bounds[0]); last=int(bounds[-1])
   for value in range(first,last+1): add(int(mask),prefixes[int(idx)]+str(value))
 for mask,nodeid in json.loads(pack['literalsJSON']): add(mask,nodeid)
 for key,countkey in [('createdNodeIds','created'),('mutatedNodeIds','mutated'),('removedNodeIds','removed')]:
  assert len(decoded[key])==pack['counts'][countkey]
 assert len(set().union(*decoded.values()))==pack['counts']['unique']
 normalized={**result,**{k:sorted(v) for k,v in decoded.items()},'callId':callid,'executedCodeSha256':hashlib.sha256(code.encode()).hexdigest(),'codecRoundTripVerified':True}
 (base/f'{view}-refine.executed.js').write_text(code)
 (base/f'{view}-refine.native-return.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 (base/f'{view}-refine.normalized.json').write_text(json.dumps(normalized,ensure_ascii=False,indent=2)+'\n')
 manifestpath=pathlib.Path(f'.figma/native-{view}-1.1.json'); manifest=json.loads(manifestpath.read_text())
 manifest['refinement']={'status':'applied-awaiting-visual-proof','rootId':result['rootId'],'proofDirectory':str(base),'returnPath':str(base/f'{view}-refine.native-return.json'),'normalizedPath':str(base/f'{view}-refine.normalized.json'),'executedCodePath':str(base/f'{view}-refine.executed.js'),'executedCodeSha256':normalized['executedCodeSha256'],'allAffectedIdCounts':pack['counts']}
 manifestpath.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'view':view,'rootId':result['rootId'],'saved':True,'counts':pack['counts'],'codecRoundTripVerified':True}))
if not matches: raise RuntimeError('No successful refinements found in session log')
