"use strict";
// Pruebas unitarias que NO necesitan PostgreSQL: mock de consultas.
// No sustituyen las pruebas de integración con PostgreSQL y Postman.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

function loadController(name, mocks) {
  const p = path.resolve(__dirname, "../src/controllers", name);
  const code = fs.readFileSync(p, "utf8");
  const module = { exports: {} };
  const context = { module, exports: module.exports, process: { env: { JWT_SECRET: "x".repeat(40) } }, console,
    require: (id) => mocks[id] || require(id) };
  vm.runInNewContext(code, context, { filename: p });
  return module.exports;
}
function response() {return { statusCode: 200, body:null, ended:false,
  status(code) {this.statusCode=code;return this},
  json(obj) {this.body=obj;return this},
  end() {this.ended=true;return this} }}
const HttpError = require("../src/utils/httpError");

test("Crear tarea añade user_id obtenido del token, no del body", async () => {
 const calls=[];
 const pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{id:1,title:args[1],completed:false}]}}};
 const ctrl=loadController("taskController.js",{"../db/pool":pool,"../utils/httpError":HttpError});
 const req={userId:7,body:{title:"  Estudiar Express  ",user_id:999}};
 const res=response();await ctrl.create(req,res);
 assert.equal(res.statusCode,201);assert.equal(calls[0].args[0],7);assert.equal(calls[0].args[1],"Estudiar Express");
});

test("Actualizar siempre filtra por id Y user_id", async () => {
 const calls=[];
 const pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[{id:4,title:"Cambió",completed:true}]}}};
 const ctrl=loadController("taskController.js",{"../db/pool":pool,"../utils/httpError":HttpError});
 const res=response();await ctrl.update({userId:9,taskId:4,body:{completed:true}},res);
 assert.match(calls[0].sql,/WHERE id = \$3 AND user_id = \$4/);assert.equal(calls[0].args[3],9);assert.equal(res.statusCode,200);
});

test("Eliminar solo borra si propietario coincide; 404 cuando no existe", async () => {
 const pool={query:async()=>({rows:[]})};
 const ctrl=loadController("taskController.js",{"../db/pool":pool,"../utils/httpError":HttpError});
 await assert.rejects(()=>ctrl.remove({userId:11,taskId:2},response()),{status:404});
});

test("Validación distingue booleano y rechaza nombres vacíos", () => {
 const {validateTask,parseTaskId}=require("../src/middleware/validate");
 let err=null;validateTask({body:{completed:false}},null,(e)=>{err=e});assert.equal(err,undefined);
 validateTask({body:{title:"  "}},null,(e)=>{err=e});assert.equal(err.status,400);
 parseTaskId({params:{id:"0"}},null,(e)=>{err=e});assert.equal(err.status,400);
});

test("Middleware JWT acepta subject numérico en texto y rechaza ausencia de token", () => {
 const p=path.resolve(__dirname,"../src/middleware/auth.js");
 const code=fs.readFileSync(p,"utf8");
 const module={exports:{}};
 const jwt={verify:(token)=> {assert.equal(token,"token-demo");return {sub:"7"};}};
 vm.runInNewContext(code,{module,exports:module.exports,require:(id)=>id==="jsonwebtoken"?jwt:HttpError,console,process:{env:{JWT_SECRET:"x".repeat(40)}}},{filename:p});
 const middleware=module.exports;
 let nextError=null;
 const req={get:()=>"Bearer token-demo"};
 middleware(req,{},(e)=>{nextError=e});
 assert.equal(req.userId,7);assert.equal(nextError,undefined);
 middleware({get:()=>""},{},(e)=>{nextError=e});
 assert.equal(nextError.status,401);
});
