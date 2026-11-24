/* texto.js
   Nome de item em forma comparável. Sem tela: também roda nos testes. */

/* Sem acento e sem maiúscula: "oleo do motor" é o mesmo item que "Óleo do motor". */
function chave(item){
  return String(item||"").normalize("NFD").replace(/[̀-ͯ]/g,"")
    .trim().toLowerCase().replace(/\s+/g," ");
}

export { chave };
