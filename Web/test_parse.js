const s = "Shirt x2 (20/pc, billed ₹40)";
const matchX = s.match(/(.*?)\s+x(\d+)\s*\(?(\d+)\)(.*)/);
console.log("matchX:", matchX);

const matchNoX = s.match(/(.*?)\s*\(?(\d+)\)(.*)/);
console.log("matchNoX:", matchNoX);

const parseServiceString = (sTrim) => {
    let name = sTrim;
    let qty = 1;
    let rate = 0;
    let amount = 0;

    const matchX = sTrim.match(/(.*?)\s+x(\d+)\s*\(?(\d+)\)(.*)/);
    if (matchX) {
      const baseName = matchX[1].trim();
      const suffix = matchX[4].trim();
      name = suffix ? `${baseName} ${suffix}` : baseName;
      qty = parseInt(matchX[2]) || 1;
      amount = parseInt(matchX[3]) || 0;
      rate = qty > 0 ? Math.round(amount / qty) : amount;
    }
    console.log({name, qty, rate, amount});
}

parseServiceString(s);
