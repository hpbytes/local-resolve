import {chromium,expect} from "@playwright/test";
import {createServer} from "vite";
process.env.VITE_FIREBASE_EMULATORS="true";
const server=await createServer({server:{host:"127.0.0.1",port:5187,strictPort:true}});
await server.listen();
const browser=await chromium.launch({channel:"msedge"});
const email="workspace-"+Date.now()+"@example.test", password="emulated-test-password";
try{
 for(const create of [true,false]){
  const ctx=await browser.newContext(),page=await ctx.newPage();
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto("http://127.0.0.1:5187/cloud");
  if(create)await page.getByRole("button",{name:"Create a cloud account",exact:true}).click();
  await page.getByLabel("Cloud account email").fill(email);await page.getByLabel("Cloud account password").fill(password);
  await page.getByRole("button",{name:create?"Create cloud account":"Open cloud workspace",exact:true}).click();
  await expect(page.getByText("Private cloud workspace",{exact:true})).toBeVisible({timeout:30000});
  const locality=page.getByRole("combobox",{name:"Locality",exact:true});
  if(create){await locality.selectOption("Gandhipuram");await expect(page.getByText("Connected",{exact:true})).toBeVisible()}
  await expect(locality).toHaveValue("Gandhipuram");expect(errors).toEqual([]);await ctx.close();
 }
 console.log("Cloud workspace persisted across independent Edge profiles.");
}finally{await browser.close();await server.close()}
