/* ================= DATA: recipe library + staples catalog ================= */
const UNITS = ['cup','tbsp','tsp','lb','oz','g','kg','ml','l','clove','can','whole','slice','pinch','bunch','stalk','head','sheet','leaf','pkg','sprig','jar','ear'];

function parseQty(s){
  s = String(s).trim();
  if (/^\d+\/\d+$/.test(s)) { const [a,b] = s.split('/').map(Number); return a/b; }
  const n = parseFloat(s); return isFinite(n) ? n : 1;
}
function parseIng(s){
  s = String(s || '').trim(); if (!s) return null;
  const parts = s.split(/\s+/);
  let qty = 1, i = 0;
  if (/^[\d.\/]+$/.test(parts[0])) { qty = parseQty(parts[0]); i = 1; }
  let unit = '';
  if (parts[i] && UNITS.includes(parts[i].toLowerCase())) { unit = parts[i].toLowerCase(); i++; }
  const name = parts.slice(i).join(' ').trim();
  if (!name) return null;
  return { qty, unit: unit === 'whole' ? '' : unit, name };
}

const LIB = [];
function R(title, cuisine, meal, time, servings, kcal, protein, carbs, ings, steps){
  LIB.push({
    id: 'lib-' + (LIB.length + 1), title, cuisine, meal, time, servings,
    nutrition: { kcal, protein, carbs },
    ingredients: ings.split(';').map(parseIng).filter(Boolean),
    steps: steps.split('|').map(s => s.trim()).filter(Boolean),
    source: 'library'
  });
}

/* ---- Breakfast ---- */
R('Classic Scrambled Eggs','American','Breakfast',10,2,280,18,2,
'4 whole eggs; 2 tbsp milk; 1 tbsp butter; 1 pinch salt; 1 pinch black pepper; 1 tbsp chives',
'Whisk eggs, milk, salt and pepper until no streaks remain.|Melt butter in a nonstick pan over medium-low heat.|Add the eggs and stir slowly with a spatula, pulling curds in from the edges.|Take off the heat while still slightly glossy — they finish cooking on the plate.|Top with chopped chives and serve.');
R('Fluffy Pancakes','American','Breakfast',20,4,350,9,52,
'1.5 cup flour; 2 tbsp sugar; 2 tsp baking powder; 1/4 tsp salt; 1.25 cup milk; 1 whole egg; 3 tbsp butter; 1/4 cup maple syrup',
'Whisk flour, sugar, baking powder and salt in a bowl.|Melt the butter. In a second bowl whisk milk, egg and melted butter.|Pour wet into dry and stir just until combined — lumps are fine.|Heat a lightly greased skillet over medium. Pour 1/4 cup batter per pancake.|Flip when bubbles form and the edges look set, about 2 minutes. Cook 1 minute more.|Serve warm with maple syrup.');
R('Avocado Toast with Egg','American','Breakfast',10,2,380,14,30,
'2 slice bread; 1 whole avocado; 2 whole eggs; 1 tsp lemon juice; 1 pinch red pepper flakes; 1 pinch salt',
'Toast the bread until golden.|Mash avocado with lemon juice and salt.|Fry or poach the eggs to your liking.|Spread avocado on the toast and top each slice with an egg.|Finish with red pepper flakes.');
R('Overnight Oats','American','Breakfast',5,2,360,14,55,
'1 cup rolled oats; 1 cup milk; 1/2 cup greek yogurt; 1 tbsp chia seeds; 1 tbsp honey; 1/2 cup blueberries',
'Stir oats, milk, yogurt, chia seeds and honey together.|Divide between two jars and cover.|Refrigerate at least 4 hours or overnight.|Top with blueberries before serving.');
R('Huevos Rancheros','Mexican','Breakfast',25,4,420,18,38,
'8 whole corn tortillas; 8 whole eggs; 1 can black beans; 1 cup salsa; 1/2 cup cotija cheese; 1 whole avocado; 2 tbsp vegetable oil; 1/4 cup cilantro',
'Warm the black beans in a small pot with a splash of water and mash lightly.|Heat the salsa in another pan until bubbling.|Crisp the tortillas in a little oil, about 30 seconds per side.|Fry the eggs sunny-side up in the remaining oil.|Layer tortillas, beans, eggs and salsa. Top with cotija, avocado and cilantro.');
R('Shakshuka','Middle Eastern','Breakfast',30,4,260,14,16,
'2 tbsp olive oil; 1 whole onion; 1 whole bell pepper; 3 clove garlic; 1 tsp cumin; 1 tsp paprika; 1 can crushed tomatoes; 6 whole eggs; 1/4 cup feta cheese; 2 tbsp parsley',
'Heat oil in a large skillet. Cook diced onion and pepper until soft, about 6 minutes.|Add minced garlic, cumin and paprika and cook 1 minute.|Pour in the tomatoes, season with salt and simmer 10 minutes until thickened.|Make small wells in the sauce and crack an egg into each.|Cover and cook 5–8 minutes until the whites are set.|Top with feta and parsley.');
R('Breakfast Burritos','Mexican','Breakfast',20,4,520,26,42,
'4 whole flour tortillas; 6 whole eggs; 1/2 lb breakfast sausage; 1 cup cheddar cheese; 2 whole potatoes; 1/2 cup salsa; 1 tbsp vegetable oil',
'Dice potatoes small and fry in oil until crisp and tender, about 12 minutes.|Brown the sausage in a separate pan, breaking it up.|Scramble the eggs and fold in the sausage and potatoes.|Warm the tortillas and fill with the mixture, cheese and salsa.|Roll tightly, tucking in the sides.');
R('Greek Yogurt Parfait','Mediterranean','Breakfast',5,2,310,18,40,
'1.5 cup greek yogurt; 1/2 cup granola; 1 cup strawberries; 1 tbsp honey',
'Slice the strawberries.|Layer yogurt, berries and granola in two glasses.|Drizzle with honey and serve right away so the granola stays crunchy.');
R('Spinach Feta Omelette','Mediterranean','Breakfast',15,2,320,22,4,
'5 whole eggs; 2 cup spinach; 1/3 cup feta cheese; 1 tbsp butter; 1 pinch salt; 1 pinch black pepper',
'Whisk eggs with salt and pepper.|Wilt the spinach in half the butter and set aside.|Melt the remaining butter, pour in the eggs and let them set at the edges.|Add spinach and feta to one half, fold, and cook 1 more minute.|Slice in half to serve two.');
R('French Toast','French','Breakfast',20,4,380,12,48,
'8 slice bread; 4 whole eggs; 1 cup milk; 1 tsp vanilla extract; 1 tsp cinnamon; 2 tbsp butter; 1/4 cup maple syrup',
'Whisk eggs, milk, vanilla and cinnamon in a shallow dish.|Melt butter in a skillet over medium heat.|Dip each bread slice for a few seconds per side.|Cook 2–3 minutes per side until golden.|Serve with maple syrup.');

/* ---- Lunch ---- */
R('Chicken Caesar Salad','American','Lunch',20,4,450,38,14,
'1.5 lb chicken breast; 2 head romaine lettuce; 1/2 cup caesar dressing; 1/2 cup parmesan cheese; 1 cup croutons; 1 tbsp olive oil; 1 whole lemon',
'Season the chicken with salt and pepper and rub with olive oil.|Cook in a hot skillet 6–7 minutes per side until it reaches 165°F inside. Rest 5 minutes.|Chop the romaine and toss with dressing and a squeeze of lemon.|Slice the chicken and arrange over the salad.|Top with parmesan and croutons.');
R('Caprese Sandwich','Italian','Lunch',10,2,480,20,44,
'1 whole ciabatta; 8 oz fresh mozzarella; 2 whole tomatoes; 1/4 cup basil; 1 tbsp balsamic glaze; 1 tbsp olive oil',
'Split the ciabatta and brush the cut sides with olive oil.|Layer sliced mozzarella, tomato and basil leaves.|Season with salt and pepper and drizzle with balsamic glaze.|Close, slice in half and serve.');
R('Turkey Club Wrap','American','Lunch',10,2,460,30,36,
'2 whole flour tortillas; 6 oz deli turkey; 4 slice bacon; 1 whole tomato; 1 cup lettuce; 2 tbsp mayonnaise',
'Cook the bacon until crisp and drain on paper towels.|Spread mayonnaise over each tortilla.|Layer turkey, bacon, lettuce and sliced tomato.|Roll tightly and cut on the diagonal.');
R('Mediterranean Chickpea Salad','Mediterranean','Lunch',15,4,320,12,38,
'2 can chickpeas; 1 whole cucumber; 1 cup cherry tomatoes; 1/2 whole red onion; 1/4 cup parsley; 3 tbsp olive oil; 2 tbsp lemon juice; 1/2 cup feta cheese',
'Drain and rinse the chickpeas.|Dice the cucumber, halve the tomatoes, and finely chop the onion and parsley.|Whisk olive oil, lemon juice, salt and pepper.|Toss everything together and top with feta.');
R('Tomato Basil Soup','Italian','Lunch',35,4,220,5,24,
'2 tbsp olive oil; 1 whole onion; 3 clove garlic; 2 can crushed tomatoes; 2 cup vegetable broth; 1/2 cup heavy cream; 1/4 cup basil',
'Cook chopped onion in the oil until soft, about 6 minutes. Add garlic for 1 minute.|Add the tomatoes and broth and simmer 20 minutes.|Blend until smooth.|Stir in the cream and torn basil and season to taste.');
R('Black Bean Quesadillas','Mexican','Lunch',15,4,430,18,46,
'8 whole flour tortillas; 1 can black beans; 2 cup cheddar cheese; 1 cup corn; 1 tsp cumin; 1/2 cup salsa',
'Mash the beans lightly with cumin.|Spread beans on 4 tortillas, top with corn and cheese, then another tortilla.|Cook in a dry skillet 2–3 minutes per side until golden and melted.|Cut into wedges and serve with salsa.');
R('Chicken Fried Rice','Chinese','Lunch',25,4,480,26,58,
'4 cup cooked rice; 1 lb chicken breast; 3 whole eggs; 1 cup frozen peas and carrots; 3 tbsp soy sauce; 1 tbsp sesame oil; 3 whole green onions; 2 tbsp vegetable oil',
'Dice the chicken and stir-fry in 1 tbsp oil until cooked; set aside.|Scramble the eggs in the same pan; set aside.|Add the remaining oil, then the cold rice; fry until it starts to crisp.|Add peas and carrots, the chicken and the eggs.|Season with soy sauce and sesame oil and finish with sliced green onions.');
R('Miso Soup with Tofu','Japanese','Lunch',15,4,120,9,8,
'4 cup water; 3 tbsp miso paste; 7 oz firm tofu; 2 whole green onions; 1 sheet nori',
'Bring the water to a gentle simmer.|Whisk the miso with a ladle of the hot water, then stir it back in. Don’t let it boil.|Add cubed tofu and warm through.|Top with sliced green onion and strips of nori.');
R('Greek Salad','Mediterranean','Lunch',15,4,240,6,12,
'1 whole cucumber; 4 whole tomatoes; 1 whole green bell pepper; 1/2 whole red onion; 1/2 cup kalamata olives; 6 oz feta cheese; 3 tbsp olive oil; 1 tbsp red wine vinegar; 1 tsp oregano',
'Cut cucumber, tomatoes and pepper into chunks and slice the onion thinly.|Combine in a bowl with the olives.|Whisk oil, vinegar and oregano and pour over the salad.|Top with a slab or crumbles of feta.');
R('Tuna Melt','American','Lunch',15,2,520,32,30,
'1 can tuna; 2 tbsp mayonnaise; 1 stalk celery; 4 slice bread; 2 slice cheddar cheese; 1 tbsp butter',
'Mix the tuna, mayonnaise and finely diced celery.|Butter the outside of the bread.|Fill with the tuna and cheese.|Cook in a skillet over medium heat 3 minutes per side until golden and melted.');
R('Red Lentil Soup','Middle Eastern','Lunch',45,6,280,16,42,
'1.5 cup red lentils; 1 whole onion; 2 whole carrots; 3 clove garlic; 1 tsp cumin; 6 cup vegetable broth; 2 tbsp olive oil; 1 whole lemon',
'Cook diced onion and carrot in the oil until soft, about 8 minutes.|Add garlic and cumin for 1 minute.|Add rinsed lentils and broth; simmer 25 minutes until tender.|Blend partially for a creamy texture.|Finish with lemon juice and season to taste.');
R('Cold Sesame Noodles','Chinese','Lunch',20,4,450,13,58,
'12 oz spaghetti; 3 tbsp tahini; 3 tbsp soy sauce; 1 tbsp rice vinegar; 1 tbsp sesame oil; 1 tbsp honey; 1 whole cucumber; 3 whole green onions; 1 tbsp sesame seeds',
'Cook the noodles, rinse under cold water and drain well.|Whisk tahini, soy sauce, vinegar, sesame oil and honey, thinning with a little water.|Toss the noodles with the sauce.|Top with julienned cucumber, green onion and sesame seeds.');
R('BLT Sandwich','American','Lunch',15,2,500,18,30,
'8 slice bacon; 4 slice bread; 1 whole tomato; 4 leaf lettuce; 2 tbsp mayonnaise',
'Cook the bacon until crisp.|Toast the bread and spread with mayonnaise.|Layer lettuce, sliced tomato and bacon.|Close and slice.');
R('Chicken Tortilla Soup','Mexican','Lunch',40,6,340,28,26,
'1.5 lb chicken breast; 1 whole onion; 2 clove garlic; 1 can diced tomatoes; 1 can black beans; 1 cup corn; 6 cup chicken broth; 1 tsp cumin; 1 tsp chili powder; 1 cup tortilla chips; 1 whole lime',
'Cook the diced onion until soft, then add garlic, cumin and chili powder.|Add broth, tomatoes and the whole chicken breasts; simmer 20 minutes.|Remove the chicken, shred it and return it to the pot with the beans and corn.|Simmer 5 minutes and add lime juice.|Serve topped with crushed tortilla chips.');

/* ---- Dinner ---- */
R('Spaghetti Bolognese','Italian','Dinner',50,6,620,32,70,
'1 lb spaghetti; 1 lb ground beef; 1 whole onion; 1 whole carrot; 1 stalk celery; 3 clove garlic; 2 tbsp tomato paste; 1 can crushed tomatoes; 1/2 cup milk; 1/2 cup parmesan cheese; 2 tbsp olive oil',
'Finely chop the onion, carrot and celery and cook in the oil for 8 minutes.|Add garlic and beef and brown well.|Stir in the tomato paste, then the tomatoes and milk.|Simmer gently for 30 minutes, stirring now and then.|Cook the spaghetti, toss with the sauce and serve with parmesan.');
R('Chicken Parmesan','Italian','Dinner',45,4,640,48,40,
'2 lb chicken breast; 1 cup breadcrumbs; 1/2 cup parmesan cheese; 2 whole eggs; 1/2 cup flour; 2 cup marinara sauce; 1.5 cup mozzarella cheese; 3 tbsp olive oil',
'Heat the oven to 425°F. Pound the chicken to an even 1/2 inch.|Dredge in flour, dip in beaten egg, then press into breadcrumbs mixed with parmesan.|Pan-fry in oil 3 minutes per side until golden.|Move to a baking dish and top with marinara and mozzarella.|Bake 15 minutes until bubbling and the chicken reaches 165°F.');
R('Shrimp Scampi','Italian','Dinner',25,4,520,30,50,
'12 oz linguine; 1 lb shrimp; 4 tbsp butter; 4 clove garlic; 1/2 cup white wine; 1 whole lemon; 1/4 tsp red pepper flakes; 1/4 cup parsley',
'Cook the linguine and save 1/2 cup of pasta water.|Melt half the butter and add garlic and pepper flakes for 30 seconds.|Add the shrimp and cook 1–2 minutes per side until pink.|Add the wine and lemon juice and simmer 2 minutes.|Toss with the pasta, remaining butter and parsley, loosening with pasta water.');
R('Margherita Flatbread','Italian','Dinner',25,4,480,20,52,
'4 whole flatbreads; 1 cup marinara sauce; 8 oz fresh mozzarella; 1/4 cup basil; 1 tbsp olive oil',
'Heat the oven to 450°F.|Spread marinara over the flatbreads and add torn mozzarella.|Bake 10–12 minutes until bubbling.|Top with basil and a drizzle of olive oil.');
R('Beef Tacos','Mexican','Dinner',25,4,520,30,32,
'1 lb ground beef; 2 tbsp taco seasoning; 8 whole corn tortillas; 1 cup lettuce; 1 whole tomato; 1 cup cheddar cheese; 1/2 cup sour cream; 1/2 cup salsa',
'Brown the beef in a skillet and drain excess fat.|Add taco seasoning and 1/3 cup water; simmer 5 minutes.|Warm the tortillas in a dry pan.|Fill with beef and top with lettuce, tomato, cheese, sour cream and salsa.');
R('Chicken Fajitas','Mexican','Dinner',30,4,460,36,34,
'1.5 lb chicken breast; 2 whole bell peppers; 1 whole onion; 2 tbsp fajita seasoning; 2 tbsp vegetable oil; 8 whole flour tortillas; 1 whole lime',
'Slice the chicken, peppers and onion into strips.|Toss the chicken with the seasoning and half the oil.|Sear the chicken in a very hot skillet 5–6 minutes and set aside.|Cook the peppers and onion in the remaining oil until charred at the edges.|Return the chicken, squeeze in lime and serve in warm tortillas.');
R('Kung Pao Chicken','Chinese','Dinner',30,4,450,34,22,
'1.5 lb chicken thighs; 2 tbsp soy sauce; 1 tbsp rice vinegar; 1 tbsp sugar; 1 tbsp cornstarch; 6 whole dried chilies; 3 clove garlic; 1 tbsp ginger; 1/2 cup peanuts; 3 whole green onions; 2 tbsp vegetable oil',
'Cube the chicken and toss with 1 tbsp soy sauce and the cornstarch.|Mix the remaining soy sauce, vinegar, sugar and 2 tbsp water for the sauce.|Fry the chilies in hot oil for 30 seconds, then add the chicken and cook until browned.|Add garlic and ginger for 30 seconds.|Pour in the sauce, toss in peanuts and green onions, and cook until glossy.');
R('Beef and Broccoli','Chinese','Dinner',25,4,420,32,20,
'1 lb flank steak; 4 cup broccoli; 3 tbsp soy sauce; 2 tbsp oyster sauce; 1 tbsp brown sugar; 1 tbsp cornstarch; 2 clove garlic; 1 tbsp ginger; 2 tbsp vegetable oil',
'Slice the beef thinly against the grain and toss with cornstarch.|Whisk soy sauce, oyster sauce, brown sugar and 1/4 cup water.|Steam or blanch the broccoli for 2 minutes.|Sear the beef in hot oil in batches, then add garlic and ginger.|Add the sauce and broccoli and toss until glossy. Serve over rice.');
R('Chicken Teriyaki','Japanese','Dinner',30,4,430,38,30,
'1.5 lb chicken thighs; 1/3 cup soy sauce; 2 tbsp mirin; 2 tbsp honey; 1 tbsp ginger; 1 tsp cornstarch; 1 tbsp vegetable oil; 1 tbsp sesame seeds',
'Whisk soy sauce, mirin, honey, ginger and cornstarch with 2 tbsp water.|Sear the chicken in oil, skin side down, 6 minutes; flip and cook 5 more.|Pour in the sauce and simmer until thick and glossy.|Slice and top with sesame seeds. Serve with rice.');
R('Salmon Rice Bowls','Japanese','Dinner',25,4,520,34,50,
'1.5 lb salmon fillet; 3 cup cooked rice; 1 whole avocado; 1 whole cucumber; 2 tbsp soy sauce; 1 tbsp sesame oil; 1 tbsp sriracha; 2 tbsp mayonnaise; 1 tbsp sesame seeds',
'Heat the oven to 400°F. Brush the salmon with 1 tbsp soy sauce and the sesame oil.|Roast 12–14 minutes until it flakes.|Mix mayonnaise and sriracha for the sauce.|Divide rice into bowls and add flaked salmon, avocado and cucumber.|Drizzle with the sauce and remaining soy sauce and sprinkle with sesame seeds.');
R('Pad Thai','Thai','Dinner',30,4,560,26,66,
'8 oz rice noodles; 1/2 lb shrimp; 2 whole eggs; 3 tbsp fish sauce; 2 tbsp brown sugar; 2 tbsp lime juice; 1 tbsp tamarind paste; 1 cup bean sprouts; 3 whole green onions; 1/3 cup peanuts; 2 tbsp vegetable oil',
'Soak the noodles in hot water for 8 minutes and drain.|Mix fish sauce, sugar, lime juice and tamarind.|Cook the shrimp in oil until pink, push aside and scramble the eggs.|Add the noodles and sauce and toss 2–3 minutes until absorbed.|Fold in sprouts and green onions and top with crushed peanuts.');
R('Thai Green Curry','Thai','Dinner',35,4,480,30,28,
'1.5 lb chicken thighs; 3 tbsp green curry paste; 1 can coconut milk; 1 cup chicken broth; 1 whole bell pepper; 1 whole zucchini; 1 tbsp fish sauce; 1 tbsp brown sugar; 1/4 cup basil; 1 tbsp vegetable oil',
'Fry the curry paste in oil for 1 minute until fragrant.|Add the sliced chicken and cook 4 minutes.|Pour in coconut milk and broth and simmer 10 minutes.|Add sliced pepper and zucchini and cook 5 minutes.|Season with fish sauce and sugar and stir in the basil. Serve with rice.');
R('Chicken Tikka Masala','Indian','Dinner',45,4,520,38,22,
'1.5 lb chicken thighs; 1/2 cup plain yogurt; 2 tbsp garam masala; 1 whole onion; 3 clove garlic; 1 tbsp ginger; 1 can tomato sauce; 3/4 cup heavy cream; 2 tbsp butter; 1/4 cup cilantro',
'Toss the chicken with yogurt and 1 tbsp garam masala and marinate at least 15 minutes.|Sear the chicken in a hot pan until charred and set aside.|Melt the butter, cook the onion until golden, then add garlic, ginger and the remaining garam masala.|Add the tomato sauce and simmer 10 minutes.|Stir in the cream and chicken and simmer 8 minutes. Top with cilantro.');
R('Chana Masala','Indian','Dinner',35,4,340,13,48,
'2 can chickpeas; 1 whole onion; 3 clove garlic; 1 tbsp ginger; 1 can diced tomatoes; 1 tbsp garam masala; 1 tsp cumin; 1 tsp turmeric; 2 tbsp vegetable oil; 1/4 cup cilantro; 1 whole lemon',
'Cook the diced onion in oil until deep golden, about 10 minutes.|Add garlic, ginger and spices and cook 1 minute.|Add the tomatoes and simmer 5 minutes.|Add drained chickpeas and 1/2 cup water and simmer 15 minutes, mashing a few.|Finish with lemon juice and cilantro.');
R('Palak Paneer','Indian','Dinner',35,4,380,18,14,
'10 oz paneer; 10 oz spinach; 1 whole onion; 2 clove garlic; 1 tbsp ginger; 1 whole tomato; 1 tsp garam masala; 1/4 cup heavy cream; 2 tbsp ghee',
'Blanch the spinach 1 minute, cool, and blend smooth.|Brown cubed paneer in half the ghee and set aside.|Cook onion, garlic and ginger in the remaining ghee until soft, then add chopped tomato and garam masala.|Stir in the spinach purée and simmer 5 minutes.|Add the cream and paneer and heat through.');
R('Bibimbap','Korean','Dinner',40,4,560,28,70,
'4 cup cooked rice; 3/4 lb ground beef; 2 cup spinach; 2 whole carrots; 1 whole zucchini; 1 cup bean sprouts; 4 whole eggs; 3 tbsp gochujang; 2 tbsp soy sauce; 1 tbsp sesame oil',
'Brown the beef with the soy sauce.|Separately sauté julienned carrot and zucchini, wilt the spinach and blanch the sprouts. Season each with a little sesame oil.|Fry the eggs sunny-side up.|Divide rice into bowls and arrange the vegetables and beef on top.|Add an egg and gochujang, and mix everything before eating.');
R('Beef Bulgogi','Korean','Dinner',30,4,480,32,28,
'1.5 lb ribeye steak; 1/4 cup soy sauce; 2 tbsp brown sugar; 1 whole pear; 3 clove garlic; 1 tbsp sesame oil; 1 whole onion; 3 whole green onions; 1 tbsp sesame seeds',
'Slice the beef very thin (20 minutes in the freezer helps).|Grate the pear and mix with soy sauce, sugar, garlic and sesame oil.|Marinate the beef and sliced onion at least 15 minutes.|Cook in a very hot pan in batches until caramelized.|Top with green onion and sesame seeds and serve with rice.');
R('Lemon Herb Roast Chicken','American','Dinner',70,4,560,42,24,
'4 lb whole chicken; 1 whole lemon; 4 clove garlic; 2 tbsp butter; 1 tbsp thyme; 1 tbsp rosemary; 1 tsp salt; 1 lb baby potatoes',
'Heat the oven to 425°F and pat the chicken dry.|Mix soft butter with herbs and garlic; rub it under and over the skin and season with salt.|Stuff the cavity with the halved lemon.|Roast on a bed of potatoes about 60 minutes, until the thigh reaches 165°F.|Rest 10 minutes before carving.');
R('Coq au Vin','French','Dinner',90,6,520,40,12,
'3 lb chicken thighs; 6 slice bacon; 8 oz mushrooms; 1 whole onion; 2 whole carrots; 3 clove garlic; 2 cup red wine; 1 cup chicken broth; 2 tbsp tomato paste; 2 tbsp flour; 1 tbsp thyme',
'Cook chopped bacon until crisp and remove.|Brown the seasoned chicken in the fat and remove.|Cook onion, carrots and mushrooms 8 minutes, then add garlic, tomato paste and flour.|Pour in the wine and broth and add the thyme, bacon and chicken.|Cover and simmer 60 minutes until tender.');
R('Ratatouille','French','Dinner',50,4,220,5,26,
'1 whole eggplant; 2 whole zucchini; 1 whole bell pepper; 1 whole onion; 3 clove garlic; 1 can diced tomatoes; 3 tbsp olive oil; 1 tsp thyme; 1/4 cup basil',
'Cut all the vegetables into 3/4-inch pieces.|Brown the eggplant in oil and remove. Repeat with the zucchini.|Cook onion and pepper until soft, then add garlic and thyme.|Add the tomatoes and return all the vegetables; simmer 25 minutes.|Season and finish with basil.');
R('Chicken Souvlaki','Mediterranean','Dinner',30,4,420,40,20,
'1.5 lb chicken breast; 3 tbsp olive oil; 2 tbsp lemon juice; 2 clove garlic; 1 tsp oregano; 4 whole pita bread; 1 cup tzatziki; 1 whole tomato; 1/2 whole red onion',
'Cube the chicken and marinate with oil, lemon, garlic and oregano for 15 minutes.|Thread onto skewers.|Grill or pan-sear 10–12 minutes, turning, until cooked through.|Warm the pitas and fill with chicken, tzatziki, tomato and onion.');
R('Falafel Bowls','Middle Eastern','Dinner',40,4,520,18,62,
'2 can chickpeas; 1/2 whole onion; 3 clove garlic; 1/2 cup parsley; 1 tsp cumin; 3 tbsp flour; 1/2 cup vegetable oil; 2 cup cooked rice; 1/2 cup hummus; 1 whole cucumber; 1 cup cherry tomatoes; 3 tbsp tahini',
'Pulse drained chickpeas, onion, garlic, parsley, cumin and flour into a coarse paste.|Form into 16 small patties.|Shallow-fry in oil 3 minutes per side until crisp.|Build bowls with rice, cucumber, tomatoes and hummus.|Top with falafel and a drizzle of tahini thinned with lemon and water.');
R('Sheet-Pan Sausage and Veggies','American','Dinner',35,4,450,22,24,
'1 lb smoked sausage; 1 lb baby potatoes; 2 whole bell peppers; 1 whole red onion; 2 cup broccoli; 2 tbsp olive oil; 1 tsp italian seasoning',
'Heat the oven to 425°F.|Halve the potatoes and roast with half the oil for 15 minutes.|Add sliced sausage, peppers, onion and broccoli tossed with the remaining oil and seasoning.|Roast 20 minutes more, tossing once.');
R('Classic Cheeseburgers','American','Dinner',25,4,620,34,34,
'1.5 lb ground beef; 4 slice cheddar cheese; 4 whole hamburger buns; 1 whole tomato; 4 leaf lettuce; 1/2 whole red onion; 2 tbsp ketchup; 1 tbsp mustard',
'Form the beef into 4 patties slightly wider than the buns and season generously.|Cook in a hot skillet or on a grill 4 minutes per side.|Top with cheese for the last minute.|Toast the buns and build the burgers with toppings and sauces.');
R('Stovetop Mac and Cheese','American','Dinner',30,6,560,22,58,
'1 lb elbow macaroni; 4 tbsp butter; 1/4 cup flour; 3 cup milk; 3 cup cheddar cheese; 1 tsp dry mustard; 1 pinch salt',
'Cook the macaroni until just al dente and drain.|Melt the butter, whisk in the flour and cook 1 minute.|Slowly whisk in the milk and simmer until thickened.|Off the heat, stir in the cheese and mustard until smooth.|Fold in the pasta and season with salt.');
R('Baked Salmon with Asparagus','American','Dinner',20,4,400,36,8,
'1.5 lb salmon fillet; 1 bunch asparagus; 2 tbsp olive oil; 1 whole lemon; 2 clove garlic; 1 tsp dill',
'Heat the oven to 400°F.|Arrange the salmon and trimmed asparagus on a sheet pan.|Drizzle with oil and add minced garlic, dill, salt, pepper and lemon slices.|Roast 12–15 minutes until the salmon flakes.');
R('Tofu Vegetable Stir-Fry','Chinese','Dinner',25,4,340,18,30,
'14 oz firm tofu; 2 cup broccoli; 1 whole bell pepper; 1 whole carrot; 3 tbsp soy sauce; 1 tbsp hoisin sauce; 1 tbsp cornstarch; 2 clove garlic; 1 tbsp ginger; 2 tbsp vegetable oil',
'Press and cube the tofu, then toss with cornstarch.|Fry the tofu in oil until golden on all sides and set aside.|Stir-fry the vegetables 4 minutes, then add garlic and ginger.|Add soy sauce and hoisin with 2 tbsp water, then return the tofu.|Toss until glazed. Serve with rice.');
R('Beef Chili','American','Dinner',60,6,450,32,34,
'1.5 lb ground beef; 1 whole onion; 1 whole bell pepper; 3 clove garlic; 2 tbsp chili powder; 1 tsp cumin; 2 can kidney beans; 1 can crushed tomatoes; 1 cup beef broth; 1 cup cheddar cheese',
'Brown the beef in a large pot and drain excess fat.|Add onion and pepper and cook 6 minutes. Add garlic and spices.|Add the beans, tomatoes and broth.|Simmer 40 minutes, stirring occasionally.|Serve topped with cheddar.');
R('Pesto Chicken Pasta','Italian','Dinner',25,4,610,36,58,
'12 oz penne; 1 lb chicken breast; 1/2 cup basil pesto; 1 cup cherry tomatoes; 1/3 cup parmesan cheese; 1 tbsp olive oil',
'Cook the penne and save 1/2 cup of pasta water.|Season and cook the chicken in oil until done, then slice.|Toss the pasta with pesto, halved tomatoes and chicken, loosening with pasta water.|Top with parmesan.');
R('Mushroom Risotto','Italian','Dinner',45,4,460,12,64,
'1.5 cup arborio rice; 12 oz mushrooms; 1 whole shallot; 2 clove garlic; 1/2 cup white wine; 5 cup chicken broth; 2 tbsp butter; 1/2 cup parmesan cheese; 1 tbsp olive oil',
'Warm the broth in a pot.|Brown sliced mushrooms in the oil and set aside.|Cook shallot and garlic in the butter, add the rice and toast 2 minutes.|Add the wine, then the broth one ladle at a time, stirring, for about 20 minutes.|Stir in the mushrooms and parmesan and rest 2 minutes before serving.');

/* ---- Snacks & desserts ---- */
R('Classic Guacamole','Mexican','Snack',10,4,180,3,10,
'3 whole avocados; 1 whole lime; 1/4 whole red onion; 1 whole jalapeño; 1/4 cup cilantro; 1 whole tomato; 1/2 tsp salt',
'Mash the avocados with lime juice and salt.|Fold in finely chopped onion, jalapeño, cilantro and tomato.|Taste, adjust and serve right away.');
R('Silky Hummus','Middle Eastern','Snack',10,6,190,7,16,
'1 can chickpeas; 1/4 cup tahini; 2 tbsp lemon juice; 1 clove garlic; 2 tbsp olive oil; 1/2 tsp cumin',
'Blend the chickpeas, tahini, lemon juice, garlic and cumin.|Stream in 2–4 tbsp cold water until very smooth.|Season, swirl into a bowl and drizzle with olive oil.');
R('Chocolate Chip Cookies','American','Dessert',30,24,180,2,24,
'2.25 cup flour; 1 tsp baking soda; 1 tsp salt; 1 cup butter; 3/4 cup sugar; 3/4 cup brown sugar; 2 whole eggs; 1 tsp vanilla extract; 2 cup chocolate chips',
'Heat the oven to 375°F.|Whisk flour, baking soda and salt.|Beat soft butter and both sugars until fluffy, then beat in the eggs and vanilla.|Mix in the dry ingredients, then the chocolate chips.|Scoop onto sheets and bake 9–11 minutes until golden at the edges.');
R('Banana Bread','American','Dessert',70,10,260,4,40,
'3 whole bananas; 1/3 cup butter; 3/4 cup sugar; 1 whole egg; 1 tsp vanilla extract; 1 tsp baking soda; 1.5 cup flour; 1/4 tsp salt',
'Heat the oven to 350°F and grease a loaf pan.|Mash the bananas and stir in the melted butter.|Mix in sugar, egg and vanilla, then the baking soda and salt.|Fold in the flour just until combined.|Bake 55–60 minutes until a toothpick comes out clean.');
R('Berry Banana Smoothie','American','Snack',5,2,220,6,46,
'1 whole banana; 1 cup frozen berries; 1 cup milk; 1/2 cup greek yogurt; 1 tbsp honey',
'Add everything to a blender.|Blend until smooth, adding a splash of milk if too thick.|Pour and serve.');
R('Mango Sticky Rice','Thai','Dessert',90,4,420,5,78,
'1 cup glutinous rice; 1 can coconut milk; 1/3 cup sugar; 1/2 tsp salt; 2 whole mangoes; 1 tbsp sesame seeds',
'Soak the rice at least 1 hour, then steam 20 minutes until tender.|Warm 3/4 of the coconut milk with the sugar and salt and stir it into the hot rice. Rest 15 minutes.|Simmer the remaining coconut milk with a pinch of salt for the topping.|Serve the rice with sliced mango, the topping and sesame seeds.');

/* ---- Staples catalog (~200 items). Format: name or name|pack-count ---- */
const STAPLES = {
  'Produce': 'lemongrass, mint, sage, thai chilies, red cabbage, green cabbage, pineapple chunks, apples, bananas|6, avocados, lemons, limes, oranges, strawberries, blueberries, raspberries, grapes, mangoes, pears, tomatoes, cherry tomatoes, potatoes, baby potatoes, sweet potatoes, onions, red onion, shallots, garlic, ginger, carrots, celery, broccoli, cauliflower, spinach, romaine lettuce, mixed greens, kale, cucumber, zucchini, bell peppers, green bell pepper, jalapeño, mushrooms, asparagus, green onions, cilantro, parsley, basil, bean sprouts, eggplant, corn, green beans, chives',
  'Meat & Seafood': 'ground pork, ground chicken, italian sausage, pork shoulder, sirloin steak, chorizo, pancetta, chicken breast, chicken thighs, whole chicken, ground beef, flank steak, ribeye steak, ground turkey, pork chops, bacon, breakfast sausage, smoked sausage, deli turkey, ham, salmon fillet, shrimp, cod fillet',
  'Dairy & Eggs': 'ricotta cheese, mascarpone, gruyere cheese, provolone cheese, eggs|12, milk, heavy cream, half and half, butter, greek yogurt, plain yogurt, sour cream, cream cheese, cheddar cheese, mozzarella cheese, fresh mozzarella, parmesan cheese, feta cheese, cotija cheese, paneer, ghee, tzatziki, oat milk, almond milk',
  'Bakery': 'bread, ciabatta, hamburger buns|8, flour tortillas|10, corn tortillas|30, pita bread|6, flatbreads|4, bagels|6, english muffins|6, naan|4',
  'Pantry': 'cannellini beans, refried beans, basmati rice, rice paper, egg noodles, lasagna noodles, ziti, instant ramen, cocoa powder, powdered sugar, pumpkin puree, cream of mushroom soup, enchilada sauce, green chiles, japanese curry roux, flour, sugar, brown sugar, baking powder, baking soda, vanilla extract, chocolate chips, rolled oats, granola, rice, jasmine rice, arborio rice, glutinous rice, quinoa, spaghetti, penne, linguine, elbow macaroni, rice noodles, breadcrumbs, panko, croutons, chickpeas, black beans, kidney beans, red lentils, crushed tomatoes, diced tomatoes, tomato sauce, tomato paste, marinara sauce, coconut milk, chicken broth, vegetable broth, beef broth, tuna, peanut butter, honey, maple syrup, olive oil, vegetable oil, sesame oil, cornstarch, chia seeds, peanuts, almonds, walnuts, sesame seeds, tahini, tortilla chips, nori, dried chilies, kalamata olives',
  'Spices': 'salt, black pepper, red pepper flakes, cumin, paprika, smoked paprika, chili powder, garlic powder, onion powder, oregano, thyme, rosemary, dill, cinnamon, turmeric, garam masala, curry powder, italian seasoning, taco seasoning, fajita seasoning, dry mustard, bay leaves',
  'Condiments': 'kimchi, chili bean paste, red curry paste, bbq sauce, dijon mustard, capers, soy sauce, oyster sauce, hoisin sauce, fish sauce, sriracha, gochujang, miso paste, mirin, rice vinegar, red wine vinegar, balsamic glaze, apple cider vinegar, ketchup, mustard, mayonnaise, caesar dressing, ranch dressing, salsa, basil pesto, green curry paste, tamarind paste, hummus, hot sauce, worcestershire sauce',
  'Frozen': 'frozen peas and carrots, frozen berries, frozen broccoli, frozen corn, frozen spinach, frozen shrimp, frozen pizza, ice cream, frozen waffles, frozen mixed vegetables',
  'Beverages': 'coffee, tea, orange juice, sparkling water, white wine, red wine, beer, kombucha',
  'Snacks': 'crackers, pretzels, popcorn, trail mix, granola bars, potato chips'
};
function buildDefaultCatalog(){
  const out = [];
  for (const [cat, list] of Object.entries(STAPLES)) {
    for (const raw of list.split(',')) {
      const [name, per] = raw.trim().split('|');
      if (!name) continue;
      out.push({ id: 'c' + out.length, name, cat, per: per ? Number(per) : 0, asin: '', title: '', term: name });
    }
  }
  return out;
}
