import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cpSync, mkdtempSync, mkdirSync, writeFileSync, rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

test("production ignores only safe changes since last deployed SHA", () => {
  const root=mkdtempSync(join(tmpdir(),"atmosferi-vercel-ignore-"));
  const source="scripts/vercel-ignore-build.mjs";
  const git=(...args)=>execFileSync("git",args,{cwd:root,encoding:"utf8"}).trim();
  const commit=(msg)=>{
    git("add","-A");
    git("-c","commit.gpgsign=false","commit","-qm",msg);
    return git("rev-parse","HEAD");
  };
  const evaluate=(previous,env="production")=> {
    const extra={
      VERCEL_ENV:env,
      VERCEL_GIT_PREVIOUS_SHA:previous ?? "",
      VERCEL_GIT_COMMIT_REF:"main"
    };
    const result=spawnSync(process.execPath,["ignore.mjs"],{
      cwd:root,encoding:"utf8",env:{...process.env,...extra},timeout:15000
    });
    return {status:result.status,stdout:result.stdout,stderr:result.stderr};
  };
  try {
    git("init","-q");
    git("config","user.name","SEO CI");
    git("config","user.email","ci@example.invalid");
    cpSync(source,join(root,"ignore.mjs"));
    writeFileSync(join(root,"index.html"),"<!doctype html><title>Original</title>");
    const baseline=commit("initial deployed website");

    mkdirSync(join(root,"scripts","gsc"),{recursive:true});
    mkdirSync(join(root,".github","workflows"),{recursive:true});
    writeFileSync(join(root,"scripts","gsc","monitor.mjs"),"// monitored");
    writeFileSync(join(root,".github","workflows","gsc-monitor.yml"),"name: Monitoring");
    const backendOnly=commit("change Google index monitoring");
    assert.equal(evaluate(baseline).status,0,"Only backend/GitHub changes should skip build");

    // An HTML change since last deployed SHA must NOT be hidden just because
    // the latest HEAD commit might be backend-only.
    writeFileSync(join(root,"index.html"),"<!doctype html><title>Updated site</title>");
    const publishedChange=commit("change public homepage");
    assert.equal(evaluate(baseline).status,1,"Published HTML diff should build");
    assert.equal(evaluate(backendOnly).status,1,"Published HTML diff from last deployed commit should build");

    mkdirSync(join(root,"docs"),{recursive:true});
    writeFileSync(join(root,"docs","seo.md"),"Internal notes");
    const docsOnly=commit("internal SEO notes");
    assert.equal(evaluate(publishedChange).status,0,"Docs-only after last published SHA should skip");
    assert.equal(evaluate(baseline).status,1,"Previously unbuilt site changes should still publish");

    assert.equal(evaluate("").status,1,"Unknown baseline should build");
    assert.equal(evaluate("0".repeat(40)).status,1,"Missing prior commit must build");
    assert.equal(evaluate(docsOnly).status,1,"No changed files must build");
    assert.equal(evaluate(baseline,"preview").status,1,"Ordinary preview behavior stays unchanged");
  } finally {
    rmSync(root,{recursive:true,force:true});
  }
});
