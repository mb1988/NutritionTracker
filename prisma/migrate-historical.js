// @ts-nocheck
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const HISTORICAL = {
  "2026-03-26": { calories:1260,protein:73,carbs:105,fat:40,satFat:9.7,fibre:10.7,addedSugar:8,naturalSugar:7,salt:1.8,steps:0,alcohol:0,omega3:2000,meals:[{name:"2x oat milk lattes (Oatly Barista 200ml each)",calories:240,satFat:1.2,addedSugar:8,naturalSugar:0,omega3:0},{name:"Chicken thigh stew (163g) + courgette + onion + stock + 75g basmati rice",calories:500,satFat:5.5,addedSugar:0,naturalSugar:4,omega3:0},{name:"Grilled salmon (~150g) + broccoli + boiled potatoes",calories:520,satFat:3,addedSugar:0,naturalSugar:3,omega3:2000}]},
  "2026-03-25": { calories:2261,protein:124.5,carbs:244,fat:85,satFat:18,fibre:31.8,addedSugar:4,naturalSugar:16.8,salt:3.2,steps:8200,alcohol:0,omega3:800,meals:[{name:"Jason's sourdough + Whole Earth peanut butter + 2x oatly latte",calories:456,satFat:3,addedSugar:4,naturalSugar:0,omega3:0},{name:"3 turkey sausages + mash + carrot broccoli babycorn fine beans + olive oil",calories:760,satFat:8,addedSugar:0,naturalSugar:5,omega3:0},{name:"Hake ~250g + salad + avocado + olive oil + 2 slices Allinson's",calories:775,satFat:6,addedSugar:0,naturalSugar:11.8,omega3:800},{name:"Grissini 65g (late night snack)",calories:270,satFat:1,addedSugar:0,naturalSugar:0,omega3:0}]},
  "2026-03-24": { calories:2215,protein:76.8,carbs:294,fat:78,satFat:12.2,fibre:49.7,addedSugar:2,naturalSugar:18,salt:4.5,steps:5200,alcohol:0,omega3:0,meals:[{name:"1 slice Allinson's + half avocado + banana",calories:334,satFat:2.2,addedSugar:0,naturalSugar:12,omega3:0},{name:"Aubergine pasta bake",calories:543,satFat:0.5,addedSugar:0,naturalSugar:12,omega3:0},{name:"Double espresso",calories:5,satFat:0,addedSugar:0,naturalSugar:0,omega3:0},{name:"Beef burger + white roll + lettuce + tomato + cheddar + mustard + mayo",calories:431,satFat:5,addedSugar:2,naturalSugar:2,omega3:0},{name:"Oven potatoes + sweet potato + olive oil",calories:530,satFat:2.5,addedSugar:0,naturalSugar:4,omega3:0},{name:"3 slices Allinson's bread",calories:372,satFat:1.8,addedSugar:0,naturalSugar:0,omega3:0}]},
  "2026-03-23": { calories:2141,protein:86.5,carbs:243,fat:68,satFat:19.6,fibre:32,addedSugar:0,naturalSugar:10,salt:3.5,steps:4800,alcohol:0,omega3:0,meals:[{name:"1 egg + 1 slice Allinson's + oatly latte",calories:254,satFat:2.4,addedSugar:0,naturalSugar:0,omega3:0},{name:"Aubergine pasta bake",calories:543,satFat:0.5,addedSugar:0,naturalSugar:12,omega3:0},{name:"BB sparkling lemon drink",calories:46,satFat:0,addedSugar:0,naturalSugar:0,omega3:0},{name:"3 turkey sausages + mash + cauliflower broccoli cheese",calories:924,satFat:16.1,addedSugar:0,naturalSugar:4,omega3:0},{name:"1 slice Allinson's + olive oil",calories:214,satFat:0.6,addedSugar:0,naturalSugar:0,omega3:0}]},
  "2026-03-22": { calories:2137,protein:114,carbs:195,fat:76,satFat:13,fibre:44,addedSugar:5,naturalSugar:22,salt:2.5,steps:10200,alcohol:0,omega3:0,meals:[{name:"2 eggs + 2 Allinson's toast + coffee + 100ml OJ",calories:508,satFat:4.3,addedSugar:5,naturalSugar:5,omega3:0},{name:"Roasted chicken leg + baby potatoes + steamed broccoli",calories:455,satFat:2.5,addedSugar:0,naturalSugar:2,omega3:0},{name:"Clementine",calories:25,satFat:0,addedSugar:0,naturalSugar:5,omega3:0},{name:"Chicken breast + salad + olive oil + 5 baby potatoes",calories:455,satFat:2.2,addedSugar:0,naturalSugar:3,omega3:0},{name:"3 slices Allinson's + olive oil",calories:407,satFat:1.8,addedSugar:0,naturalSugar:0,omega3:0},{name:"Dark choc 3 squares + 0% Greek yoghurt + honey + blueberries",calories:263,satFat:2.2,addedSugar:5,naturalSugar:12,omega3:0}]},
  "2026-03-21": { calories:3180,protein:180.7,carbs:299,fat:94.3,satFat:23.6,fibre:49.1,addedSugar:14,naturalSugar:28,salt:5.5,steps:12000,alcohol:0,omega3:300,meals:[{name:"Porridge + blueberries + banana + honey + barista almond milk",calories:385,satFat:0.5,addedSugar:8,naturalSugar:20,omega3:0},{name:"1 rasher bacon + clementine + coffee",calories:108,satFat:0.6,addedSugar:0,naturalSugar:5,omega3:0},{name:"Zoo sandwiches - bacon avocado chicken mayo cheese",calories:820,satFat:8,addedSugar:4,naturalSugar:2,omega3:0},{name:"Half tuna mayo sweetcorn sandwich + Diet Coke",calories:242,satFat:0.7,addedSugar:2,naturalSugar:1,omega3:300},{name:"Sirloin 227g + baby potatoes + sweet potatoes + asparagus + garlic butter",calories:1025,satFat:11,addedSugar:0,naturalSugar:0,omega3:0},{name:"Quarter tuna + quarter chicken sandwich",calories:230,satFat:0.7,addedSugar:0,naturalSugar:0,omega3:0},{name:"Dark chocolate 2 squares + roasted peanuts 20g",calories:170,satFat:2.5,addedSugar:4,naturalSugar:0,omega3:0}]},
  "2026-03-20": { calories:3195,protein:142,carbs:390,fat:124,satFat:25.6,fibre:54.7,addedSugar:58,naturalSugar:35,salt:5.2,steps:8800,alcohol:0,omega3:400,meals:[{name:"Bloomer + Avocado + Olive Oil",calories:370,satFat:3.5,addedSugar:0,naturalSugar:1,omega3:0},{name:"Banana + Apple",calories:170,satFat:0,addedSugar:0,naturalSugar:31,omega3:0},{name:"Tuna + Bloomer + Peanuts + Blue Dragon Kit",calories:1439,satFat:6,addedSugar:26,naturalSugar:4,omega3:0},{name:"KitKat Chunky",calories:250,satFat:8,addedSugar:28,naturalSugar:2,omega3:0},{name:"Salad + Tuna + Quarter Pizza + Allinsons + Anchovies",calories:791,satFat:6.6,addedSugar:0,naturalSugar:4,omega3:400},{name:"Banana + Dark Chocolate",calories:175,satFat:1.5,addedSugar:4,naturalSugar:12,omega3:0}]},
  "2026-03-19": { calories:1899,protein:83,carbs:245,fat:55,satFat:10.3,fibre:16.6,addedSugar:44,naturalSugar:14,salt:4.2,steps:6200,alcohol:0,omega3:200,meals:[{name:"OJ + Banana Cake",calories:350,satFat:3,addedSugar:15,naturalSugar:10,omega3:0},{name:"Banana + 2x Oat Milk Latte",calories:220,satFat:0.5,addedSugar:4,naturalSugar:12,omega3:0},{name:"Sourdough + Olive Oil",calories:204,satFat:1.6,addedSugar:0,naturalSugar:0,omega3:0},{name:"Blue Dragon Kit + Chicken + Veg",calories:747,satFat:2.7,addedSugar:25,naturalSugar:4,omega3:0},{name:"Sourdough + Anchovies",calories:174,satFat:0.9,addedSugar:0,naturalSugar:0,omega3:200}]},
  "2026-03-18": { calories:2150,protein:80,carbs:240,fat:65,satFat:16,fibre:10,addedSugar:30,naturalSugar:10,salt:3.8,steps:5000,alcohol:0,omega3:300,meals:[{name:"Banana cake + fresh OJ",calories:350,satFat:3,addedSugar:15,naturalSugar:5,omega3:0},{name:"Penne with turkey ragu",calories:480,satFat:3,addedSugar:2,naturalSugar:4,omega3:0},{name:"Gnocchi + creme fraiche + salmon + peas + onion + tomatoes",calories:550,satFat:6,addedSugar:0,naturalSugar:6,omega3:300},{name:"Chocolate snack",calories:150,satFat:3,addedSugar:12,naturalSugar:0,omega3:0},{name:"2x coffees + Diet Coke",calories:60,satFat:0.2,addedSugar:1,naturalSugar:0,omega3:0}]},
  "2026-03-17": { calories:1950,protein:90,carbs:230,fat:65,satFat:12,fibre:22,addedSugar:22,naturalSugar:8,salt:3.5,steps:7500,alcohol:0,omega3:0,meals:[{name:"Seed bread + peanut butter + oat milk latte",calories:350,satFat:2,addedSugar:2,naturalSugar:0,omega3:0},{name:"Red lentils + broccoli + courgette + baby potatoes + feta",calories:420,satFat:2,addedSugar:0,naturalSugar:5,omega3:0},{name:"SUN wholegrain crisps 25g",calories:115,satFat:0.5,addedSugar:1,naturalSugar:0,omega3:0},{name:"Eat Natural apple and almond bar 25g",calories:110,satFat:1,addedSugar:5,naturalSugar:3,omega3:0},{name:"2x Haribo sweets",calories:30,satFat:0,addedSugar:6,naturalSugar:0,omega3:0},{name:"Penne 125g + turkey ragu",calories:480,satFat:3,addedSugar:2,naturalSugar:4,omega3:0},{name:"Banana cake + dark Lindor + grissini 65g",calories:445,satFat:2.5,addedSugar:6,naturalSugar:5,omega3:0}]},
};

function dist(mCal, tCal, dTotal) {
  if (tCal === 0) return 0;
  return Math.round((mCal / tCal) * dTotal * 10) / 10;
}

async function main() {
  console.log("Migrating historical data...");
  const user = await prisma.user.upsert({ where: { email: "test@test.com" }, update: {}, create: { email: "test@test.com" } });
  console.log("User:", user.id);

  for (const [date, data] of Object.entries(HISTORICAL)) {
    const ex = await prisma.day.findUnique({ where: { userId_date: { userId: user.id, date } } });
    if (ex) {
      await prisma.meal.deleteMany({ where: { dayId: ex.id } });
      await prisma.day.delete({ where: { id: ex.id } });
    }
    const day = await prisma.day.create({
      data: {
        userId: user.id, date,
        totalCalories: data.calories, totalProtein: data.protein, totalCarbs: data.carbs,
        totalFat: data.fat, totalSatFat: data.satFat, totalFibre: data.fibre,
        totalAddedSugar: data.addedSugar, totalNaturalSugar: data.naturalSugar,
        totalSalt: data.salt, totalSteps: data.steps, totalAlcohol: data.alcohol,
        totalOmega3: data.omega3,
      },
    });
    for (const m of data.meals) {
      await prisma.meal.create({
        data: {
          userId: user.id, dayId: day.id, name: m.name, calories: m.calories,
          satFat: m.satFat, addedSugar: m.addedSugar, naturalSugar: m.naturalSugar,
          alcohol: 0, omega3: m.omega3 || 0,
          protein: dist(m.calories, data.calories, data.protein),
          carbs: dist(m.calories, data.calories, data.carbs),
          fat: dist(m.calories, data.calories, data.fat),
          fibre: dist(m.calories, data.calories, data.fibre),
          salt: dist(m.calories, data.calories, data.salt),
        },
      });
    }
    console.log("OK", date, data.calories + "kcal", data.meals.length + " meals");
  }
  console.log("DONE -", Object.keys(HISTORICAL).length, "days migrated");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

