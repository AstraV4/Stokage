import React, { useState, useMemo, useCallback } from 'react';
import {
  MapPin, ChevronRight, ChevronLeft, Users, Baby, Wallet, UtensilsCrossed,
  Flame, Microwave, CookingPot, Check, X, Clock, Repeat, Zap,
  ThermometerSun, Leaf, WheatOff, MilkOff, Moon, Ban, ShoppingCart,
  TrendingDown, RotateCcw, Download, Copy, ChefHat, Timer, Package,
  ArrowRight, Star, Sparkles, Dumbbell, HeartPulse, Rocket, Coffee, Sandwich,
  Plus, Trash2, AlertCircle
} from 'lucide-react';

/* =========================================================================
   BASE DE DONNEES SIMULEE
   ========================================================================= */
const SUPERMARKETS = [
  { id: 'lidl', name: 'Lidl', color: '#0050AA' },
  { id: 'aldi', name: 'Aldi', color: '#00549F' },
  { id: 'carrefour', name: 'Carrefour', color: '#004E9E' },
  { id: 'leclerc', name: 'E.Leclerc', color: '#0066B3' },
  { id: 'auchan', name: 'Auchan', color: '#E2001A' },
  { id: 'intermarche', name: 'Intermarché', color: '#E2001A' },
  { id: 'casino', name: 'Géant Casino', color: '#E30613' },
  { id: 'monoprix', name: 'Monoprix', color: '#FF6600' },
  { id: 'cora', name: 'Cora', color: '#DA291C' },
  { id: 'franprix', name: 'Franprix', color: '#00A651' },
  { id: 'grandfrais', name: 'Grand Frais', color: '#7AB61B' },
  { id: 'naturalia', name: 'Naturalia', color: '#4C7C3F' },
];

const EQUIPMENT = [
  { id: 'four', name: 'Four traditionnel', icon: ThermometerSun },
  { id: 'airfryer', name: 'Air Fryer', icon: Flame },
  { id: 'microondes', name: 'Micro-ondes', icon: Microwave },
  { id: 'plaques', name: 'Plaques de cuisson', icon: Flame },
  { id: 'thermomix', name: 'Robot cuiseur', icon: CookingPot },
  { id: 'poele', name: 'Poêle / Casserole', icon: CookingPot },
];

const DIETS = [
  { id: 'vegetarien', name: 'Végétarien', icon: Leaf },
  { id: 'vegetalien', name: 'Végétalien', icon: Leaf },
  { id: 'sansgluten', name: 'Sans gluten', icon: WheatOff },
  { id: 'sanslactose', name: 'Sans lactose', icon: MilkOff },
  { id: 'halal', name: 'Halal', icon: Moon },
  { id: 'sansporc', name: 'Sans porc', icon: Ban },
];

const PREFS = [
  { id: 'batch', name: 'Batch cooking', desc: 'Cuisiner une fois pour 2 jours', icon: Repeat },
  { id: 'express', name: 'Repas express', desc: 'Moins de 15 minutes', icon: Zap },
  { id: 'reheatable', name: 'Réchauffable au travail', desc: 'Emporté facilement', icon: Timer },
];

const GOALS = [
  { id: 'gourmand', name: 'Gourmand', desc: 'Généreux et savoureux', icon: Sparkles },
  { id: 'protein', name: 'Riche en protéines', desc: 'Pour la récup ou la masse', icon: Dumbbell },
  { id: 'healthy', name: 'Healthy', desc: 'Léger et équilibré', icon: HeartPulse },
  { id: 'rapide', name: 'Rapide à faire', desc: 'Peu de préparation', icon: Rocket },
];

const MEAL_TYPES = [
  { id: 'petitdej', name: 'Petit-déjeuner', icon: Coffee },
  { id: 'dejeuner', name: 'Déjeuner', icon: Sandwich },
  { id: 'diner', name: 'Dîner', icon: Moon },
];

// Genere un prix legerement different par enseigne a partir d'un prix de base,
// pour simuler des ecarts realistes (Lidl/Aldi moins chers, Carrefour/Auchan plus chers)
function priceMap(base) {
  const factors = {
    lidl: 0.88, aldi: 0.86, carrefour: 1.12, leclerc: 1.02, auchan: 1.15, intermarche: 1.08,
    casino: 1.22, monoprix: 1.35, cora: 1.05, franprix: 1.18, grandfrais: 1.10, naturalia: 1.45,
  };
  const map = {};
  Object.entries(factors).forEach(([k, f]) => { map[k] = Math.round(base * f * 100) / 100; });
  return map;
}

const RECIPES = [
  { id: 'r1', emoji: '🍛', name: 'Dahl de lentilles corail au lait de coco', accent: '#F59E0B', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 25, prefs: ['batch','reheatable'], base: 1.95,
    ingredients: [{ n:'Lentilles corail', a:'Épicerie' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Curry en poudre', a:'Épicerie' }], steps: ['Faire revenir l\'oignon émincé et l\'ail dans un peu d\'huile', 'Ajouter les lentilles corail rincées et le curry en poudre, remuer 1 min', 'Verser le lait de coco et 30cl d\'eau, laisser mijoter 18 min à couvert', 'Saler, poivrer, servir avec du riz ou du pain'], brandTip: 'Vitasia (Lidl) pour le lait de coco et les épices', mealType: ['dejeuner', 'diner'], goals: ['healthy', 'gourmand'] },
  { id: 'r2', emoji: '🍗', name: 'Poulet rôti et légumes racines', accent: '#10B981', equipment: ['four'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 55, prefs: ['batch','reheatable'], base: 3.20,
    ingredients: [{ n:'Cuisses de poulet', a:'Boucherie' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Pommes de terre', a:'Fruits & Légumes' },{ n:'Thym', a:'Épicerie' }], steps: ['Préchauffer le four à 200°C', 'Disposer le poulet et les légumes coupés sur une plaque, arroser d\'huile d\'olive', 'Assaisonner avec le thym, sel et poivre', 'Enfourner 45 min en retournant à mi-cuisson'], brandTip: 'Marque Repère (Leclerc) pour le poulet Label Rouge', mealType: ['dejeuner', 'diner'], goals: ['protein', 'gourmand'] },
  { id: 'r3', emoji: '🍝', name: 'Pâtes à la carbonara traditionnelle', accent: '#F59E0B', equipment: ['plaques'], diets: [], prepTime: 20, prefs: ['express'], base: 2.10,
    ingredients: [{ n:'Spaghetti', a:'Épicerie' },{ n:'Lardons', a:'Boucherie' },{ n:'Œufs', a:'Frais' },{ n:'Parmesan', a:'Frais' }], steps: ['Cuire les spaghetti dans l\'eau bouillante salée', 'Faire revenir les lardons à sec dans une poêle', 'Battre les œufs avec le parmesan râpé', 'Hors du feu, mélanger les pâtes chaudes avec les lardons puis l\'appareil œufs-parmesan'], brandTip: 'Carrefour Classic\' pour les pâtes, Auchan pour le parmesan', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r4', emoji: '🍲', name: 'Curry de pois chiches et épinards', accent: '#10B981', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sansgluten','halal','sansporc'], prepTime: 22, prefs: ['batch','express'], base: 1.75,
    ingredients: [{ n:'Pois chiches', a:'Épicerie' },{ n:'Épinards frais', a:'Fruits & Légumes' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Ail', a:'Fruits & Légumes' }], steps: ['Faire revenir l\'ail émincé dans l\'huile', 'Ajouter les tomates concassées et laisser réduire 5 min', 'Incorporer les pois chiches égouttés et les épinards', 'Laisser mijoter 10 min, assaisonner'], brandTip: 'Carrefour Bio pour les pois chiches en conserve', mealType: ['dejeuner', 'diner'], goals: ['healthy', 'protein'] },
  { id: 'r5', emoji: '🐟', name: 'Saumon en papillote et citron', accent: '#0EA5E9', equipment: ['four'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 20, prefs: ['express','reheatable'], base: 3.85,
    ingredients: [{ n:'Pavé de saumon', a:'Frais' },{ n:'Citron', a:'Fruits & Légumes' },{ n:'Courgettes', a:'Fruits & Légumes' },{ n:'Aneth', a:'Fruits & Légumes' }], steps: ['Préchauffer le four à 180°C', 'Déposer le saumon sur du papier cuisson avec les courgettes en rondelles', 'Ajouter le citron en tranches et l\'aneth', 'Fermer la papillote, enfourner 18-20 min'], brandTip: 'Auchan Marché du Frais pour le saumon', mealType: ['dejeuner', 'diner'], goals: ['healthy', 'protein', 'gourmand'] },
  { id: 'r6', emoji: '🍚', name: 'Riz cantonais au poulet', accent: '#F59E0B', equipment: ['poele'], diets: ['sanslactose','halal','sansporc'], prepTime: 18, prefs: ['express','reheatable'], base: 2.05,
    ingredients: [{ n:'Riz long grain', a:'Épicerie' },{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Petits pois', a:'Surgelés' },{ n:'Œufs', a:'Frais' }], steps: ['Cuire le riz puis le laisser refroidir (idéalement la veille)', 'Faire revenir le poulet coupé en dés dans une poêle', 'Ajouter les petits pois et les œufs battus, remuer', 'Incorporer le riz froid, faire sauter 5 min à feu vif'], brandTip: 'Pouce (Auchan) pour le riz long grain', mealType: ['dejeuner', 'diner'], goals: ['protein', 'rapide'] },
  { id: 'r7', emoji: '🌶️', name: 'Chili con carne mijoté', accent: '#EF4444', equipment: ['plaques'], diets: ['sanslactose','sansporc'], prepTime: 40, prefs: ['batch','reheatable'], base: 2.45,
    ingredients: [{ n:'Bœuf haché', a:'Boucherie' },{ n:'Haricots rouges', a:'Épicerie' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Tomates concassées', a:'Épicerie' }], steps: ['Faire revenir le bœuf haché à feu vif', 'Ajouter le poivron émincé et les tomates concassées', 'Incorporer les haricots rouges et les épices', 'Laisser mijoter 25 min à couvert'], brandTip: 'Carrefour Classic\' pour les haricots rouges', mealType: ['dejeuner', 'diner'], goals: ['protein', 'gourmand'] },
  { id: 'r8', emoji: '🥧', name: 'Quiche sans pâte aux légumes', accent: '#10B981', equipment: ['four'], diets: ['vegetarien','sansgluten'], prepTime: 35, prefs: ['batch','reheatable'], base: 1.90,
    ingredients: [{ n:'Œufs', a:'Frais' },{ n:'Courgettes', a:'Fruits & Légumes' },{ n:'Crème fraîche', a:'Frais' },{ n:'Gruyère râpé', a:'Frais' }], steps: ['Préchauffer le four à 180°C', 'Battre les œufs avec la crème fraîche', 'Ajouter les courgettes coupées et le gruyère râpé', 'Verser dans un moule beurré, enfourner 30 min'], brandTip: 'Pâturages (Intermarché) pour la crème et le gruyère', mealType: ['dejeuner', 'diner'], goals: ['healthy', 'gourmand'] },
  { id: 'r9', emoji: '🌯', name: 'Wrap de poulet et crudités', accent: '#F59E0B', equipment: ['microondes'], diets: ['sanslactose','halal','sansporc'], prepTime: 10, prefs: ['express'], base: 2.30,
    ingredients: [{ n:'Tortillas de blé', a:'Épicerie' },{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Salade', a:'Fruits & Légumes' },{ n:'Tomate', a:'Fruits & Légumes' }], steps: ['Réchauffer le poulet précuit au micro-ondes', 'Tiédir les tortillas quelques secondes', 'Garnir de salade, tomate et poulet', 'Rouler fermement et couper en deux'], brandTip: 'Carrefour Sélection pour les tortillas de blé', mealType: ['dejeuner'], goals: ['rapide', 'protein'] },
  { id: 'r10', emoji: '🍜', name: 'Soupe miso et nouilles udon', accent: '#0EA5E9', equipment: ['plaques'], diets: ['vegetalien','sanslactose'], prepTime: 15, prefs: ['express'], base: 1.60,
    ingredients: [{ n:'Pâte miso', a:'Épicerie' },{ n:'Nouilles udon', a:'Épicerie' },{ n:'Champignons', a:'Fruits & Légumes' },{ n:'Ciboule', a:'Fruits & Légumes' }], steps: ['Faire chauffer l\'eau sans bouillir', 'Délayer la pâte miso dans un peu d\'eau chaude', 'Ajouter les nouilles udon et les champignons émincés, cuire 4 min', 'Parsemer de ciboule avant de servir'], brandTip: 'Vitasia (Lidl) pour la pâte miso et les nouilles udon', mealType: ['dejeuner', 'diner'], goals: ['healthy', 'rapide'] },
  { id: 'r11', emoji: '🌮', name: 'Tacos de bœuf haché épicé', accent: '#EF4444', equipment: ['poele'], diets: ['sanslactose','halal','sansporc'], prepTime: 20, prefs: ['express'], base: 2.35,
    ingredients: [{ n:'Bœuf haché', a:'Boucherie' },{ n:'Tortillas de maïs', a:'Épicerie' },{ n:'Cheddar', a:'Frais' },{ n:'Sauce piquante', a:'Épicerie' }], steps: ['Faire revenir le bœuf haché avec les épices à tacos', 'Réchauffer les tortillas de maïs', 'Garnir de viande, cheddar râpé et sauce piquante', 'Servir immédiatement'], brandTip: 'Auchan pour les tortillas, Intermarché pour le cheddar', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r12', emoji: '🥔', name: 'Gratin dauphinois végétarien', accent: '#10B981', equipment: ['four'], diets: ['vegetarien','sansgluten'], prepTime: 60, prefs: ['batch','reheatable'], base: 1.55,
    ingredients: [{ n:'Pommes de terre', a:'Fruits & Légumes' },{ n:'Crème fraîche', a:'Frais' },{ n:'Ail', a:'Fruits & Légumes' },{ n:'Gruyère râpé', a:'Frais' }], steps: ['Préchauffer le four à 180°C', 'Couper les pommes de terre en fines rondelles', 'Disposer en couches avec la crème fraîche, l\'ail et le gruyère', 'Enfourner 50 min jusqu\'à coloration'], brandTip: 'Marque Repère (Leclerc) pour les pommes de terre à gratin', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r13', emoji: '🥗', name: 'Buddha bowl quinoa & avocat', accent: '#10B981', equipment: ['plaques'], diets: ['vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 15, prefs: ['express'], base: 2.75,
    ingredients: [{ n:'Quinoa', a:'Épicerie' },{ n:'Avocat', a:'Fruits & Légumes' },{ n:'Pois chiches', a:'Épicerie' },{ n:'Graines de sésame', a:'Épicerie' }], steps: ['Cuire le quinoa selon les instructions du paquet', 'Égoutter et rincer les pois chiches', 'Couper l\'avocat en tranches', 'Assembler dans un bol, parsemer de graines de sésame'], brandTip: 'Carrefour Bio pour le quinoa et l\'avocat', mealType: ['dejeuner'], goals: ['healthy', 'rapide'] },
  { id: 'r14', emoji: '🍤', name: "Nuggets de poulet maison a l'Air Fryer", accent: '#F59E0B', equipment: ['airfryer'], diets: ['sanslactose','halal','sansporc'], prepTime: 18, prefs: ['express'], base: 2.15,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Chapelure', a:'Épicerie' },{ n:'Œufs', a:'Frais' },{ n:'Paprika', a:'Épicerie' }], steps: ['Couper le blanc de poulet en morceaux', 'Tremper dans l\'œuf battu puis dans la chapelure au paprika', 'Disposer dans l\'Air Fryer préchauffé à 180°C', 'Cuire 12 min en retournant à mi-cuisson'], brandTip: 'Lidl pour le poulet, Auchan pour la chapelure', mealType: ['dejeuner', 'diner'], goals: ['rapide', 'protein'] },
  { id: 'r15', emoji: '🎃', name: 'Velouté de courge au thermomix', accent: '#F59E0B', equipment: ['thermomix'], diets: ['vegetarien','vegetalien','sansgluten','halal','sansporc'], prepTime: 25, prefs: ['batch','reheatable'], base: 1.45,
    ingredients: [{ n:'Courge butternut', a:'Fruits & Légumes' },{ n:'Bouillon de légumes', a:'Épicerie' },{ n:'Crème fraîche', a:'Frais' },{ n:'Muscade', a:'Épicerie' }], steps: ['Couper la courge butternut en cubes', 'Cuire au robot 20 min avec le bouillon de légumes', 'Mixer jusqu\'à obtenir une texture lisse', 'Ajouter la crème fraîche et la muscade, mixer à nouveau'], brandTip: 'Solevita (Lidl) pour le bouillon de légumes', mealType: ['diner'], goals: ['healthy'] },
  { id: 'r16', emoji: '🍳', name: 'Omelette aux légumes de saison', accent: '#10B981', equipment: ['poele'], diets: ['vegetarien','sansgluten','halal','sansporc'], prepTime: 12, prefs: ['express'], base: 1.35,
    ingredients: [{ n:'Œufs', a:'Frais' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Champignons', a:'Fruits & Légumes' },{ n:'Persil', a:'Fruits & Légumes' }], steps: ['Battre les œufs avec sel et poivre', 'Faire revenir le poivron et les champignons coupés dans la poêle', 'Verser les œufs battus sur les légumes', 'Cuire à feu doux 5-6 min, parsemer de persil'], brandTip: 'Marque distributeur Plein Air pour les œufs', mealType: ['petitdej', 'dejeuner'], goals: ['rapide', 'healthy', 'protein'] },
  { id: 'r17', emoji: '🥣', name: "Porridge à l'avoine et banane", accent: '#F59E0B', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sanslactose','halal','sansporc'], prepTime: 8, prefs: ['express'], base: 0.85,
    ingredients: [{ n:"Flocons d'avoine", a:'Épicerie' },{ n:'Banane', a:'Fruits & Légumes' },{ n:'Lait végétal', a:'Épicerie' },{ n:'Miel', a:'Épicerie' }], steps: ["Faire chauffer le lait végétal dans une casserole", "Ajouter les flocons d'avoine, cuire 4-5 min en remuant", "Verser dans un bol, ajouter la banane coupée", "Terminer avec un filet de miel"], brandTip: "Alesto (Lidl) pour les flocons d'avoine", mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r18', emoji: '🥑', name: 'Œufs brouillés et toast avocat', accent: '#10B981', equipment: ['poele'], diets: ['vegetarien','halal','sansporc'], prepTime: 10, prefs: ['express'], base: 1.65,
    ingredients: [{ n:'Œufs', a:'Frais' },{ n:'Avocat', a:'Fruits & Légumes' },{ n:'Pain de campagne', a:'Boulangerie' },{ n:'Citron', a:'Fruits & Légumes' }], steps: ["Faire griller les tranches de pain", "Écraser l'avocat à la fourchette avec un trait de citron", "Battre les œufs et les cuire à feu doux en remuant", "Tartiner le pain d'avocat, ajouter les œufs brouillés"], brandTip: 'Carrefour Bio pour les œufs et l\'avocat', mealType: ['petitdej'], goals: ['protein','healthy','gourmand'] },
  { id: 'r19', emoji: '🥞', name: 'Pancakes légers à la banane', accent: '#F59E0B', equipment: ['poele'], diets: ['vegetarien'], prepTime: 15, prefs: ['express'], base: 1.10,
    ingredients: [{ n:'Farine', a:'Épicerie' },{ n:'Banane', a:'Fruits & Légumes' },{ n:'Œufs', a:'Frais' },{ n:'Lait', a:'Frais' }], steps: ["Écraser la banane, mélanger avec les œufs et le lait", "Ajouter la farine petit à petit en fouettant", "Verser des petites louches dans une poêle chaude légèrement huilée", "Cuire 2 min par face jusqu'à coloration"], brandTip: "Marque Repère (Leclerc) pour la farine", mealType: ['petitdej'], goals: ['gourmand','healthy'] },
  { id: 'r20', emoji: '🫐', name: 'Bowl yaourt grec, granola et fruits', accent: '#0EA5E9', equipment: [], diets: ['vegetarien','halal','sansporc'], prepTime: 5, prefs: ['express'], base: 1.45,
    ingredients: [{ n:'Yaourt grec', a:'Frais' },{ n:'Granola', a:'Épicerie' },{ n:'Fruits rouges', a:'Fruits & Légumes' },{ n:'Miel', a:'Épicerie' }], steps: ["Verser le yaourt grec dans un bol", "Ajouter le granola", "Disposer les fruits rouges par-dessus", "Terminer avec un filet de miel"], brandTip: 'Pâturages (Intermarché) pour le yaourt grec', mealType: ['petitdej'], goals: ['healthy','rapide','protein'] },
  { id: 'r21', emoji: '🍓', name: 'Smoothie bowl aux fruits rouges', accent: '#EF4444', equipment: [], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 8, prefs: ['express'], base: 1.55,
    ingredients: [{ n:'Fruits rouges surgelés', a:'Surgelés' },{ n:'Banane', a:'Fruits & Légumes' },{ n:'Lait végétal', a:'Épicerie' },{ n:'Graines de chia', a:'Épicerie' }], steps: ['Mixer les fruits rouges, la banane et le lait végétal', 'Verser dans un bol', 'Parsemer de graines de chia', 'Ajouter des fruits frais en garniture si besoin'], brandTip: 'Alesto (Lidl) pour les graines de chia', mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r22', emoji: '🍞', name: 'Pain perdu à la cannelle', accent: '#F59E0B', equipment: ['poele'], diets: ['vegetarien'], prepTime: 12, prefs: ['express'], base: 1.05,
    ingredients: [{ n:'Pain rassis', a:'Boulangerie' },{ n:'Œufs', a:'Frais' },{ n:'Lait', a:'Frais' },{ n:'Cannelle', a:'Épicerie' }], steps: ['Battre les œufs avec le lait et la cannelle', 'Tremper les tranches de pain quelques secondes', 'Faire dorer à la poêle 2-3 min par face', 'Saupoudrer de sucre ou de miel'], brandTip: 'Marque Repère (Leclerc) pour le pain de mie', mealType: ['petitdej'], goals: ['gourmand'] },
  { id: 'r23', emoji: '🥪', name: 'Muffin anglais œuf et bacon', accent: '#10B981', equipment: ['poele'], diets: ['sanslactose'], prepTime: 10, prefs: ['express'], base: 1.85,
    ingredients: [{ n:'Muffin anglais', a:'Boulangerie' },{ n:'Œufs', a:'Frais' },{ n:'Bacon', a:'Boucherie' },{ n:'Cheddar', a:'Frais' }], steps: ['Faire cuire le bacon à la poêle', 'Cuire un œuf au plat dans la même poêle', 'Griller le muffin anglais coupé en deux', 'Assembler avec le cheddar, le bacon et l\'œuf'], brandTip: 'Intermarché pour le bacon et le cheddar', mealType: ['petitdej'], goals: ['protein','gourmand'] },
  { id: 'r24', emoji: '🥣', name: 'Granola maison aux fruits secs', accent: '#F59E0B', equipment: ['four'], diets: ['vegetarien','vegetalien','halal','sansporc'], prepTime: 25, prefs: ['batch'], base: 0.95,
    ingredients: [{ n:'Flocons d\'avoine', a:'Épicerie' },{ n:'Miel', a:'Épicerie' },{ n:'Amandes', a:'Épicerie' },{ n:'Huile de coco', a:'Épicerie' }], steps: ['Mélanger les flocons d\'avoine avec le miel et l\'huile de coco', 'Ajouter les amandes concassées', 'Étaler sur une plaque, enfourner 20 min à 160°C en remuant à mi-cuisson', 'Laisser refroidir avant de servir avec du lait'], brandTip: 'Alesto (Lidl) pour les amandes', mealType: ['petitdej'], goals: ['healthy','gourmand'] },
  { id: 'r25', emoji: '🥞', name: 'Crêpes complètes jambon-fromage', accent: '#10B981', equipment: ['poele'], diets: ['halal'], prepTime: 15, prefs: [], base: 1.75,
    ingredients: [{ n:'Farine de sarrasin', a:'Épicerie' },{ n:'Œufs', a:'Frais' },{ n:'Jambon', a:'Boucherie' },{ n:'Emmental', a:'Frais' }], steps: ['Préparer la pâte à galette avec la farine, les œufs et l\'eau', 'Cuire une crêpe fine dans une poêle chaude', 'Garnir de jambon et de fromage râpé', 'Plier en carré et laisser fondre le fromage'], brandTip: 'Pâturages (Intermarché) pour l\'emmental', mealType: ['petitdej','dejeuner'], goals: ['gourmand','protein'] },
  { id: 'r26', emoji: '🍯', name: 'Chia pudding au lait de coco', accent: '#0EA5E9', equipment: [], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 5, prefs: ['batch','express'], base: 1.35,
    ingredients: [{ n:'Graines de chia', a:'Épicerie' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Miel', a:'Épicerie' },{ n:'Mangue', a:'Fruits & Légumes' }], steps: ['Mélanger les graines de chia avec le lait de coco et le miel', 'Laisser reposer au réfrigérateur toute une nuit', 'Remuer avant de servir', 'Ajouter des morceaux de mangue'], brandTip: 'Vitasia (Lidl) pour le lait de coco', mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r27', emoji: '🍑', name: 'Toast ricotta, miel et pêche', accent: '#F59E0B', equipment: ['poele'], diets: ['vegetarien'], prepTime: 8, prefs: ['express'], base: 1.45,
    ingredients: [{ n:'Pain complet', a:'Boulangerie' },{ n:'Ricotta', a:'Frais' },{ n:'Pêche', a:'Fruits & Légumes' },{ n:'Miel', a:'Épicerie' }], steps: ['Faire griller les tranches de pain complet', 'Tartiner généreusement de ricotta', 'Ajouter les tranches de pêche', 'Terminer par un filet de miel'], brandTip: 'Carrefour Sélection pour la ricotta', mealType: ['petitdej'], goals: ['gourmand','healthy'] },
  { id: 'r28', emoji: '🥜', name: 'Smoothie protéiné banane cacahuète', accent: '#F59E0B', equipment: [], diets: ['vegetarien','sansgluten','halal','sansporc'], prepTime: 5, prefs: ['express'], base: 1.6,
    ingredients: [{ n:'Banane', a:'Fruits & Légumes' },{ n:'Beurre de cacahuète', a:'Épicerie' },{ n:'Lait', a:'Frais' },{ n:'Flocons d\'avoine', a:'Épicerie' }], steps: ['Placer tous les ingrédients dans un blender', 'Mixer jusqu\'à obtenir une texture lisse', 'Ajouter un peu de lait si trop épais', 'Servir immédiatement'], brandTip: 'Alesto (Lidl) pour le beurre de cacahuète', mealType: ['petitdej'], goals: ['protein','rapide'] },
  { id: 'r29', emoji: '🍣', name: 'Poke bowl au saumon et avocat', accent: '#0EA5E9', equipment: ['plaques'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 20, prefs: [], base: 3.45,
    ingredients: [{ n:'Riz à sushi', a:'Épicerie' },{ n:'Saumon frais', a:'Frais' },{ n:'Avocat', a:'Fruits & Légumes' },{ n:'Sauce soja', a:'Épicerie' }], steps: ['Cuire le riz à sushi selon le paquet', 'Couper le saumon frais en cubes', 'Disposer le riz, le saumon et l\'avocat dans un bol', 'Assaisonner de sauce soja et de graines de sésame'], brandTip: 'Auchan Marché du Frais pour le saumon', mealType: ['dejeuner'], goals: ['healthy','gourmand'] },
  { id: 'r30', emoji: '🍆', name: 'Ratatouille provençale', accent: '#EF4444', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 35, prefs: ['batch','reheatable'], base: 1.3,
    ingredients: [{ n:'Aubergine', a:'Fruits & Légumes' },{ n:'Courgette', a:'Fruits & Légumes' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Tomates concassées', a:'Épicerie' }], steps: ['Couper tous les légumes en dés', 'Faire revenir séparément puis réunir dans une grande poêle', 'Ajouter les tomates concassées et les herbes de Provence', 'Laisser mijoter 25 min à couvert'], brandTip: 'Carrefour Bio pour les légumes', mealType: ['dejeuner','diner'], goals: ['healthy'] },
  { id: 'r31', emoji: '🍷', name: 'Bœuf bourguignon mijoté', accent: '#EF4444', equipment: ['plaques'], diets: ['sanslactose','sansporc'], prepTime: 90, prefs: ['batch','reheatable'], base: 3.9,
    ingredients: [{ n:'Bœuf à bourguignon', a:'Boucherie' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Vin rouge de cuisine', a:'Épicerie' }], steps: ['Faire revenir le bœuf en morceaux dans une cocotte', 'Ajouter les oignons et carottes émincés', 'Mouiller avec le vin rouge, saler, poivrer', 'Laisser mijoter 1h30 à feu doux'], brandTip: 'Intermarché pour la viande à bourguignon', mealType: ['diner'], goals: ['gourmand','protein'] },
  { id: 'r32', emoji: '🧆', name: 'Falafels maison et houmous', accent: '#10B981', equipment: ['airfryer'], diets: ['vegetarien','vegetalien','halal','sansporc'], prepTime: 25, prefs: ['batch'], base: 1.6,
    ingredients: [{ n:'Pois chiches', a:'Épicerie' },{ n:'Ail', a:'Fruits & Légumes' },{ n:'Cumin', a:'Épicerie' },{ n:'Houmous', a:'Frais' }], steps: ['Mixer les pois chiches égouttés avec l\'ail et le cumin', 'Former des petites boulettes', 'Cuire à l\'Air Fryer 15 min à 190°C', 'Servir avec du houmous et une salade'], brandTip: 'Carrefour Bio pour les pois chiches', mealType: ['dejeuner','diner'], goals: ['healthy','protein'] },
  { id: 'r33', emoji: '🍤', name: 'Pad thaï aux crevettes', accent: '#F59E0B', equipment: ['poele'], diets: ['sanslactose','sansporc'], prepTime: 20, prefs: ['express'], base: 2.95,
    ingredients: [{ n:'Nouilles de riz', a:'Épicerie' },{ n:'Crevettes', a:'Frais' },{ n:'Cacahuètes', a:'Épicerie' },{ n:'Sauce nuoc-mâm', a:'Épicerie' }], steps: ['Faire tremper les nouilles de riz dans l\'eau chaude', 'Faire sauter les crevettes à la poêle', 'Ajouter les nouilles égouttées et la sauce nuoc-mâm', 'Parsemer de cacahuètes concassées'], brandTip: 'Vitasia (Lidl) pour les nouilles et la sauce', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r34', emoji: '🍄', name: 'Risotto crémeux aux champignons', accent: '#10B981', equipment: ['plaques'], diets: ['vegetarien','sansgluten'], prepTime: 30, prefs: [], base: 1.85,
    ingredients: [{ n:'Riz arborio', a:'Épicerie' },{ n:'Champignons de Paris', a:'Fruits & Légumes' },{ n:'Parmesan', a:'Frais' },{ n:'Bouillon de légumes', a:'Épicerie' }], steps: ['Faire revenir les champignons émincés', 'Ajouter le riz et le nacrer 2 min', 'Mouiller progressivement avec le bouillon chaud en remuant', 'Terminer avec le parmesan râpé hors du feu'], brandTip: 'Auchan pour le riz arborio', mealType: ['dejeuner','diner'], goals: ['gourmand','healthy'] },
  { id: 'r35', emoji: '🥪', name: 'Croque-monsieur gratiné', accent: '#F59E0B', equipment: ['four'], diets: ['halal'], prepTime: 15, prefs: ['express'], base: 1.7,
    ingredients: [{ n:'Pain de mie', a:'Boulangerie' },{ n:'Jambon', a:'Boucherie' },{ n:'Emmental', a:'Frais' },{ n:'Béchamel', a:'Épicerie' }], steps: ['Tartiner le pain de béchamel', 'Garnir de jambon et de fromage', 'Assembler les sandwichs et enfourner 10 min à 200°C', 'Servir bien chaud avec une salade'], brandTip: 'Marque Repère (Leclerc) pour le pain de mie', mealType: ['dejeuner'], goals: ['gourmand'] },
  { id: 'r36', emoji: '🍛', name: 'Curry vert thaï au poulet', accent: '#10B981', equipment: ['plaques'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 25, prefs: ['batch'], base: 2.6,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Pâte de curry vert', a:'Épicerie' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Basilic thaï', a:'Fruits & Légumes' }], steps: ['Faire revenir le poulet coupé en morceaux', 'Ajouter la pâte de curry vert, mélanger 1 min', 'Verser le lait de coco, laisser mijoter 15 min', 'Parsemer de basilic thaï avant de servir'], brandTip: 'Vitasia (Lidl) pour la pâte de curry et le lait de coco', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r37', emoji: '🥗', name: 'Salade César au poulet grillé', accent: '#10B981', equipment: ['poele'], diets: ['halal','sansporc'], prepTime: 15, prefs: ['express'], base: 2.2,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Salade romaine', a:'Fruits & Légumes' },{ n:'Parmesan', a:'Frais' },{ n:'Croûtons', a:'Épicerie' }], steps: ['Griller le blanc de poulet à la poêle et le trancher', 'Laver et couper la salade romaine', 'Assembler avec les croûtons et le parmesan', 'Ajouter la sauce César'], brandTip: 'Carrefour Classic\' pour les croûtons', mealType: ['dejeuner'], goals: ['healthy','protein'] },
  { id: 'r38', emoji: '🍕', name: 'Pizza maison jambon-champignons', accent: '#EF4444', equipment: ['four'], diets: ['sansporc'], prepTime: 25, prefs: [], base: 1.95,
    ingredients: [{ n:'Pâte à pizza', a:'Épicerie' },{ n:'Sauce tomate', a:'Épicerie' },{ n:'Jambon', a:'Boucherie' },{ n:'Mozzarella', a:'Frais' }], steps: ['Étaler la pâte à pizza sur une plaque', 'Napper de sauce tomate', 'Garnir de jambon, champignons et mozzarella', 'Enfourner 15 min à 220°C'], brandTip: 'Carrefour Classic\' pour la pâte à pizza', mealType: ['dejeuner','diner'], goals: ['gourmand'] },
  { id: 'r39', emoji: '🍲', name: 'Couscous royal', accent: '#F59E0B', equipment: ['plaques'], diets: ['sanslactose','halal'], prepTime: 45, prefs: ['batch','reheatable'], base: 3.15,
    ingredients: [{ n:'Semoule de couscous', a:'Épicerie' },{ n:'Merguez', a:'Boucherie' },{ n:'Pois chiches', a:'Épicerie' },{ n:'Carottes', a:'Fruits & Légumes' }], steps: ['Préparer le bouillon avec les légumes et les épices', 'Cuire les merguez à part', 'Faire gonfler la semoule avec un peu de bouillon', 'Servir la semoule avec les légumes, pois chiches et merguez'], brandTip: 'Intermarché pour les merguez', mealType: ['diner'], goals: ['gourmand','protein'] },
  { id: 'r40', emoji: '🍔', name: 'Burger maison steak et cheddar', accent: '#EF4444', equipment: ['poele'], diets: ['sansporc'], prepTime: 18, prefs: ['express'], base: 2.75,
    ingredients: [{ n:'Steak haché', a:'Boucherie' },{ n:'Pain à burger', a:'Boulangerie' },{ n:'Cheddar', a:'Frais' },{ n:'Salade', a:'Fruits & Légumes' }], steps: ['Cuire le steak haché à la poêle selon la cuisson voulue', 'Faire fondre le cheddar sur la viande chaude', 'Griller légèrement le pain à burger', 'Assembler avec salade, sauce et le steak'], brandTip: 'Intermarché pour le steak haché', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r41', emoji: '🍯', name: 'Sauté de porc au caramel', accent: '#F59E0B', equipment: ['poele'], diets: ['sanslactose'], prepTime: 20, prefs: ['express'], base: 2.35,
    ingredients: [{ n:'Filet mignon de porc', a:'Boucherie' },{ n:'Sauce soja', a:'Épicerie' },{ n:'Sucre roux', a:'Épicerie' },{ n:'Riz', a:'Épicerie' }], steps: ['Couper le porc en fines lamelles', 'Faire caraméliser le sucre avec la sauce soja', 'Ajouter le porc et faire sauter 8 min à feu vif', 'Servir avec du riz vapeur'], brandTip: 'Intermarché pour le filet mignon', mealType: ['dejeuner','diner'], goals: ['gourmand'] },
  { id: 'r42', emoji: '🍆', name: 'Moussaka végétarienne aux lentilles', accent: '#10B981', equipment: ['four'], diets: ['vegetarien','sansgluten'], prepTime: 50, prefs: ['batch','reheatable'], base: 1.8,
    ingredients: [{ n:'Aubergine', a:'Fruits & Légumes' },{ n:'Lentilles corail', a:'Épicerie' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Béchamel', a:'Épicerie' }], steps: ['Faire griller les tranches d\'aubergine', 'Préparer une sauce lentilles-tomates épicée', 'Alterner les couches aubergine et lentilles dans un plat', 'Napper de béchamel et enfourner 30 min à 190°C'], brandTip: 'Carrefour Bio pour les lentilles corail', mealType: ['diner'], goals: ['healthy','gourmand'] },
  { id: 'r43', emoji: '🧅', name: 'Soupe à l\'oignon gratinée', accent: '#F59E0B', equipment: ['four','plaques'], diets: ['sansporc'], prepTime: 45, prefs: ['batch'], base: 1.2,
    ingredients: [{ n:'Oignons', a:'Fruits & Légumes' },{ n:'Bouillon de bœuf', a:'Épicerie' },{ n:'Pain de campagne', a:'Boulangerie' },{ n:'Gruyère râpé', a:'Frais' }], steps: ['Faire fondre longuement les oignons émincés à feu doux', 'Mouiller avec le bouillon de bœuf, laisser mijoter 20 min', 'Verser dans des bols avec une tranche de pain', 'Couvrir de gruyère et passer au four quelques minutes'], brandTip: 'Pâturages (Intermarché) pour le gruyère', mealType: ['diner'], goals: ['gourmand'] },
  { id: 'r44', emoji: '🦐', name: 'Paella de fruits de mer', accent: '#F59E0B', equipment: ['plaques'], diets: ['sanslactose','sansporc'], prepTime: 40, prefs: [], base: 3.6,
    ingredients: [{ n:'Riz à paella', a:'Épicerie' },{ n:'Fruits de mer surgelés', a:'Surgelés' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Safran', a:'Épicerie' }], steps: ['Faire revenir le poivron émincé', 'Ajouter le riz et le safran, mélanger', 'Mouiller avec du bouillon chaud, laisser cuire 18 min', 'Ajouter les fruits de mer en fin de cuisson'], brandTip: 'Auchan pour les fruits de mer surgelés', mealType: ['diner'], goals: ['gourmand','protein'] },
  { id: 'r45', emoji: '🥢', name: 'Wok de légumes et tofu croustillant', accent: '#10B981', equipment: ['poele'], diets: ['vegetarien','vegetalien','sanslactose','halal','sansporc'], prepTime: 18, prefs: ['express'], base: 1.9,
    ingredients: [{ n:'Tofu ferme', a:'Frais' },{ n:'Brocolis', a:'Fruits & Légumes' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Sauce soja', a:'Épicerie' }], steps: ['Couper le tofu en cubes et le faire dorer à la poêle', 'Réserver, puis faire sauter les légumes coupés', 'Remettre le tofu avec les légumes', 'Assaisonner de sauce soja et de graines de sésame'], brandTip: 'Vitasia (Lidl) pour le tofu', mealType: ['dejeuner','diner'], goals: ['healthy','rapide'] },
  { id: 'r46', emoji: '🥭', name: 'Smoothie bowl mangue-banane', accent: '#F59E0B', equipment: [], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 7, prefs: ['express'], base: 1.55,
    ingredients: [{ n:'Mangue', a:'Fruits & Légumes' },{ n:'Banane', a:'Fruits & Légumes' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Graines de chia', a:'Épicerie' }], steps: ['Mixer la mangue, la banane et le lait de coco', 'Verser dans un bol', 'Parsemer de graines de chia', 'Ajouter des fruits frais en topping'], brandTip: 'Freshona (Lidl) pour les fruits', mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r47', emoji: '🥣', name: 'Muesli maison et yaourt', accent: '#F59E0B', equipment: [], diets: ['vegetarien','halal','sansporc'], prepTime: 5, prefs: ['express'], base: 1.2,
    ingredients: [{ n:'Muesli', a:'Épicerie' },{ n:'Yaourt nature', a:'Frais' },{ n:'Pomme', a:'Fruits & Légumes' },{ n:'Cannelle', a:'Épicerie' }], steps: ['Verser le yaourt dans un bol', 'Ajouter le muesli', 'Couper la pomme en petits dés par-dessus', 'Saupoudrer de cannelle'], brandTip: "Nature's Pick (Aldi) pour le muesli", mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r48', emoji: '🥪', name: 'Croque-monsieur gratiné', accent: '#F59E0B', equipment: ['four'], diets: [], prepTime: 15, prefs: ['express'], base: 2.05,
    ingredients: [{ n:'Pain de mie', a:'Boulangerie' },{ n:'Jambon', a:'Boucherie' },{ n:'Emmental', a:'Frais' },{ n:'Beurre', a:'Frais' }], steps: ['Beurrer les tranches de pain de mie', 'Garnir de jambon et d\'emmental râpé', 'Recouvrir de la seconde tranche et d\'emmental', 'Passer au four 10 min à 200°C jusqu\'à gratiner'], brandTip: 'Monique Ranou (Intermarché) pour le jambon', mealType: ['petitdej','dejeuner'], goals: ['gourmand'] },
  { id: 'r49', emoji: '🍯', name: 'Tartines ricotta, miel et noix', accent: '#F59E0B', equipment: [], diets: ['vegetarien','halal','sansporc'], prepTime: 6, prefs: ['express'], base: 1.75,
    ingredients: [{ n:'Pain de campagne', a:'Boulangerie' },{ n:'Ricotta', a:'Frais' },{ n:'Miel', a:'Épicerie' },{ n:'Noix', a:'Épicerie' }], steps: ['Faire griller le pain', 'Tartiner généreusement de ricotta', 'Ajouter un filet de miel', 'Parsemer de noix concassées'], brandTip: 'Alesto (Lidl) pour les noix', mealType: ['petitdej'], goals: ['gourmand','healthy'] },
  { id: 'r50', emoji: '🍅', name: 'Shakshuka aux œufs pochés', accent: '#EF4444', equipment: ['poele'], diets: ['vegetarien','sansgluten','halal','sansporc'], prepTime: 22, prefs: ['batch'], base: 1.5,
    ingredients: [{ n:'Œufs', a:'Frais' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Cumin', a:'Épicerie' }], steps: ['Faire revenir le poivron émincé', 'Ajouter les tomates concassées et le cumin, laisser mijoter 10 min', 'Creuser des puits et y casser les œufs', 'Couvrir et cuire 6-8 min jusqu\'à ce que les blancs soient pris'], brandTip: 'Carrefour Classic\' pour les tomates concassées', mealType: ['petitdej','dejeuner'], goals: ['gourmand','protein'] },
  { id: 'r51', emoji: '🧆', name: 'Falafels maison et houmous', accent: '#10B981', equipment: ['four'], diets: ['vegetarien','vegetalien','halal','sansporc'], prepTime: 35, prefs: ['batch'], base: 1.65,
    ingredients: [{ n:'Pois chiches', a:'Épicerie' },{ n:'Ail', a:'Fruits & Légumes' },{ n:'Persil', a:'Fruits & Légumes' },{ n:'Houmous', a:'Frais' }], steps: ['Mixer les pois chiches égouttés avec l\'ail et le persil', 'Former des boulettes', 'Enfourner 20 min à 200°C en retournant à mi-cuisson', 'Servir avec le houmous'], brandTip: 'Carrefour Bio pour les pois chiches', mealType: ['dejeuner','diner'], goals: ['healthy','protein'] },
  { id: 'r52', emoji: '🍣', name: 'Poke bowl saumon et avocat', accent: '#0EA5E9', equipment: [], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 15, prefs: ['express'], base: 3.4,
    ingredients: [{ n:'Saumon frais', a:'Frais' },{ n:'Riz', a:'Épicerie' },{ n:'Avocat', a:'Fruits & Légumes' },{ n:'Edamame', a:'Surgelés' }], steps: ['Cuire le riz puis le laisser tiédir', 'Couper le saumon et l\'avocat en cubes', 'Disposer le riz en base dans un bol', 'Ajouter le saumon, l\'avocat et les edamame par-dessus'], brandTip: 'Auchan Marché du Frais pour le saumon', mealType: ['dejeuner'], goals: ['healthy','gourmand'] },
  { id: 'r53', emoji: '🍆', name: 'Ratatouille provençale', accent: '#EF4444', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 35, prefs: ['batch','reheatable'], base: 1.4,
    ingredients: [{ n:'Aubergine', a:'Fruits & Légumes' },{ n:'Courgette', a:'Fruits & Légumes' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Tomates', a:'Fruits & Légumes' }], steps: ['Couper tous les légumes en dés', 'Faire revenir successivement chaque légume', 'Réunir le tout avec les tomates concassées', 'Laisser mijoter 20 min à couvert'], brandTip: 'Carrefour Bio pour les légumes de saison', mealType: ['dejeuner','diner'], goals: ['healthy'] },
  { id: 'r54', emoji: '🍛', name: 'Poulet tikka masala', accent: '#EF4444', equipment: ['plaques'], diets: ['sansgluten','halal','sansporc'], prepTime: 30, prefs: ['batch','reheatable'], base: 2.6,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Sauce tomate', a:'Épicerie' },{ n:'Yaourt nature', a:'Frais' },{ n:'Épices tikka', a:'Épicerie' }], steps: ['Mariner le poulet coupé avec le yaourt et les épices', 'Faire dorer le poulet mariné', 'Ajouter la sauce tomate, laisser mijoter 15 min', 'Servir avec du riz basmati'], brandTip: 'Vitasia (Lidl) pour les épices tikka', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r55', emoji: '🍤', name: 'Pad thaï aux crevettes', accent: '#F59E0B', equipment: ['poele'], diets: ['sanslactose'], prepTime: 20, prefs: ['express'], base: 2.9,
    ingredients: [{ n:'Nouilles de riz', a:'Épicerie' },{ n:'Crevettes', a:'Frais' },{ n:'Cacahuètes', a:'Épicerie' },{ n:'Sauce pad thaï', a:'Épicerie' }], steps: ['Faire tremper les nouilles de riz dans l\'eau chaude', 'Faire sauter les crevettes à la poêle', 'Ajouter les nouilles égouttées et la sauce', 'Parsemer de cacahuètes concassées'], brandTip: 'Vitasia (Lidl) pour les nouilles et la sauce', mealType: ['dejeuner','diner'], goals: ['gourmand'] },
  { id: 'r56', emoji: '🍔', name: 'Burger maison au bœuf', accent: '#EF4444', equipment: ['poele'], diets: ['sanslactose','sansporc'], prepTime: 18, prefs: ['express'], base: 2.7,
    ingredients: [{ n:'Bœuf haché', a:'Boucherie' },{ n:'Pain à burger', a:'Boulangerie' },{ n:'Salade', a:'Fruits & Légumes' },{ n:'Tomate', a:'Fruits & Légumes' }], steps: ['Former des steaks avec le bœuf haché, saler, poivrer', 'Cuire 3-4 min par face à la poêle', 'Griller légèrement le pain', 'Assembler avec salade, tomate et le steak'], brandTip: 'Intermarché pour le bœuf haché', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r57', emoji: '🍕', name: 'Pizza maison margherita', accent: '#EF4444', equipment: ['four'], diets: ['vegetarien'], prepTime: 25, prefs: ['batch'], base: 1.85,
    ingredients: [{ n:'Pâte à pizza', a:'Frais' },{ n:'Sauce tomate', a:'Épicerie' },{ n:'Mozzarella', a:'Frais' },{ n:'Basilic', a:'Fruits & Légumes' }], steps: ['Étaler la pâte à pizza', 'Napper de sauce tomate', 'Répartir la mozzarella', 'Enfourner 12-15 min à 220°C, ajouter le basilic frais en sortant'], brandTip: 'Carrefour Classic\' pour la pâte à pizza', mealType: ['dejeuner','diner'], goals: ['gourmand'] },
  { id: 'r58', emoji: '🍲', name: 'Couscous de poulet et légumes', accent: '#F59E0B', equipment: ['plaques'], diets: ['halal','sansporc','sanslactose'], prepTime: 40, prefs: ['batch','reheatable'], base: 2.35,
    ingredients: [{ n:'Semoule de couscous', a:'Épicerie' },{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Pois chiches', a:'Épicerie' }], steps: ['Faire mijoter le poulet et les légumes avec du bouillon', 'Ajouter les pois chiches, laisser cuire 20 min', 'Préparer la semoule selon le paquet', 'Servir la semoule avec le poulet, les légumes et le bouillon'], brandTip: "Vitasia ou Carrefour Sélection pour la semoule", mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r59', emoji: '🥗', name: 'Salade César au poulet', accent: '#10B981', equipment: [], diets: [], prepTime: 12, prefs: ['express','rapide'], base: 2.5,
    ingredients: [{ n:'Salade romaine', a:'Fruits & Légumes' },{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Parmesan', a:'Frais' },{ n:'Croûtons', a:'Épicerie' }], steps: ['Couper la salade romaine', 'Trancher le poulet cuit', 'Ajouter le parmesan râpé et les croûtons', 'Napper de sauce César'], brandTip: 'Auchan pour le poulet précuit', mealType: ['dejeuner'], goals: ['protein','rapide'] },
  { id: 'r60', emoji: '🌱', name: 'Chili végétarien sans viande', accent: '#EF4444', equipment: ['plaques'], diets: ['vegetarien','vegetalien','sansgluten','sanslactose','halal','sansporc'], prepTime: 30, prefs: ['batch','reheatable'], base: 1.5,
    ingredients: [{ n:'Haricots rouges', a:'Épicerie' },{ n:'Maïs', a:'Surgelés' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Poivron', a:'Fruits & Légumes' }], steps: ['Faire revenir le poivron émincé', 'Ajouter les tomates concassées et les épices', 'Incorporer les haricots rouges et le maïs', 'Laisser mijoter 20 min à couvert'], brandTip: 'Carrefour Classic\' pour les haricots rouges', mealType: ['dejeuner','diner'], goals: ['healthy','protein'] },
  { id: 'r61', emoji: '🥞', name: 'Galettes de sarrasin jambon-fromage', accent: '#F59E0B', photoQuery: 'buckwheat galette ham cheese', equipment: ['poele'], diets: ['sansgluten'], prepTime: 20, prefs: ['express'], base: 2.1,
    ingredients: [{ n:'Farine de sarrasin', a:'Épicerie' },{ n:'Jambon', a:'Boucherie' },{ n:'Emmental', a:'Frais' },{ n:'Œufs', a:'Frais' }], steps: ['Préparer la pâte à galette avec la farine de sarrasin et l\'eau', 'Cuire la galette dans une poêle chaude', 'Garnir de jambon, fromage et un œuf', 'Replier les bords et poursuivre la cuisson 2 min'], brandTip: 'Marque Repère (Leclerc) pour la farine de sarrasin', mealType: ['petitdej','dejeuner'], goals: ['gourmand'] },
  { id: 'r62', emoji: '🍎', name: 'Crumble aux pommes', accent: '#F59E0B', photoQuery: 'apple crumble dessert', equipment: ['four'], diets: ['vegetarien'], prepTime: 35, prefs: ['batch'], base: 1.3,
    ingredients: [{ n:'Pommes', a:'Fruits & Légumes' },{ n:'Farine', a:'Épicerie' },{ n:'Beurre', a:'Frais' },{ n:'Sucre roux', a:'Épicerie' }], steps: ['Couper les pommes en morceaux dans un plat', 'Mélanger farine, beurre et sucre du bout des doigts', 'Répartir ce crumble sur les pommes', 'Enfourner 30 min à 180°C'], brandTip: 'Carrefour Bio pour les pommes', mealType: ['dejeuner'], goals: ['gourmand'] },
  { id: 'r63', emoji: '🍚', name: 'Bibimbap coréen au bœuf', accent: '#EF4444', photoQuery: 'bibimbap korean rice bowl', equipment: ['poele'], diets: ['sanslactose','sansporc'], prepTime: 30, prefs: [], base: 2.9,
    ingredients: [{ n:'Riz', a:'Épicerie' },{ n:'Bœuf haché', a:'Boucherie' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Œufs', a:'Frais' }], steps: ['Cuire le riz', 'Faire sauter le bœuf assaisonné puis les légumes séparément', 'Disposer le riz en bol avec les légumes et le bœuf', 'Ajouter un œuf au plat par-dessus'], brandTip: 'Vitasia (Lidl) pour la sauce coréenne', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r64', emoji: '🍛', name: 'Curry vert thaï au poulet', accent: '#10B981', photoQuery: 'thai green curry chicken', equipment: ['plaques'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 25, prefs: ['express'], base: 2.7,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Pâte de curry vert', a:'Épicerie' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Basilic thaï', a:'Fruits & Légumes' }], steps: ['Faire revenir le poulet coupé en lamelles', 'Ajouter la pâte de curry vert, mélanger 1 min', 'Verser le lait de coco, laisser mijoter 12 min', 'Parsemer de basilic thaï avant de servir'], brandTip: 'Vitasia (Lidl) pour la pâte de curry', mealType: ['dejeuner','diner'], goals: ['gourmand','protein'] },
  { id: 'r65', emoji: '🍅', name: 'Minestrone aux légumes', accent: '#EF4444', photoQuery: 'minestrone vegetable soup', equipment: ['plaques'], diets: ['vegetarien','vegetalien','halal','sansporc'], prepTime: 30, prefs: ['batch','reheatable'], base: 1.15,
    ingredients: [{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Céleri', a:'Fruits & Légumes' },{ n:'Pâtes courtes', a:'Épicerie' },{ n:'Tomates concassées', a:'Épicerie' }], steps: ['Faire revenir les légumes coupés en dés', 'Ajouter les tomates concassées et le bouillon', 'Laisser mijoter 15 min', 'Ajouter les pâtes, cuire 10 min supplémentaires'], brandTip: 'Carrefour Classic\' pour les pâtes courtes', mealType: ['dejeuner','diner'], goals: ['healthy'] },
  { id: 'r66', emoji: '🍣', name: 'Sushi maki maison', accent: '#0EA5E9', photoQuery: 'sushi maki rolls', equipment: ['plaques'], diets: ['sansgluten','sanslactose','halal','sansporc'], prepTime: 40, prefs: [], base: 2.95,
    ingredients: [{ n:'Riz à sushi', a:'Épicerie' },{ n:'Feuilles de nori', a:'Épicerie' },{ n:'Avocat', a:'Fruits & Légumes' },{ n:'Concombre', a:'Fruits & Légumes' }], steps: ['Cuire le riz à sushi et l\'assaisonner de vinaigre de riz', 'Étaler le riz sur une feuille de nori', 'Garnir d\'avocat et de concombre en bâtonnets', 'Rouler fermement et couper en tranches'], brandTip: 'Vitasia (Lidl) pour le riz à sushi et le nori', mealType: ['dejeuner'], goals: ['gourmand','healthy'] },
  { id: 'r67', emoji: '🍞', name: 'Pain perdu à la cannelle', accent: '#F59E0B', photoQuery: 'french toast cinnamon', equipment: ['poele'], diets: ['vegetarien'], prepTime: 12, prefs: ['express'], base: 1.1,
    ingredients: [{ n:'Pain rassis', a:'Boulangerie' },{ n:'Œufs', a:'Frais' },{ n:'Lait', a:'Frais' },{ n:'Cannelle', a:'Épicerie' }], steps: ['Battre les œufs avec le lait et la cannelle', 'Tremper les tranches de pain dans ce mélange', 'Faire dorer à la poêle 2-3 min par face', 'Servir avec un filet de miel'], brandTip: 'Marque distributeur pour le pain rassis', mealType: ['petitdej'], goals: ['gourmand'] },
  { id: 'r68', emoji: '🌯', name: 'Wrap végétarien houmous et crudités', accent: '#10B981', photoQuery: 'veggie hummus wrap', equipment: [], diets: ['vegetarien','vegetalien','halal','sansporc'], prepTime: 8, prefs: ['express'], base: 1.7,
    ingredients: [{ n:'Tortillas de blé', a:'Épicerie' },{ n:'Houmous', a:'Frais' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Concombre', a:'Fruits & Légumes' }], steps: ['Tartiner la tortilla de houmous', 'Ajouter les carottes et le concombre en bâtonnets', 'Ajouter de la salade', 'Rouler fermement et couper en deux'], brandTip: 'Carrefour Sélection pour le houmous', mealType: ['petitdej','dejeuner'], goals: ['healthy','rapide'] },
  { id: 'r69', emoji: '🍚', name: 'Risotto aux champignons', accent: '#F59E0B', photoQuery: 'mushroom risotto', equipment: ['plaques'], diets: ['vegetarien'], prepTime: 30, prefs: ['reheatable'], base: 1.95,
    ingredients: [{ n:'Riz arborio', a:'Épicerie' },{ n:'Champignons', a:'Fruits & Légumes' },{ n:'Parmesan', a:'Frais' },{ n:'Bouillon de légumes', a:'Épicerie' }], steps: ['Faire revenir les champignons émincés, réserver', 'Faire nacrer le riz puis ajouter le bouillon louche par louche', 'Remuer régulièrement pendant 18 min', 'Ajouter les champignons et le parmesan hors du feu'], brandTip: 'Solevita (Lidl) pour le bouillon', mealType: ['dejeuner','diner'], goals: ['gourmand'] },
  { id: 'r70', emoji: '🍖', name: 'Bœuf bourguignon mijoté', accent: '#EF4444', photoQuery: 'beef bourguignon stew', equipment: ['plaques'], diets: ['sanslactose','sansporc'], prepTime: 50, prefs: ['batch','reheatable'], base: 3.1,
    ingredients: [{ n:'Bœuf à mijoter', a:'Boucherie' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Vin rouge à cuisiner', a:'Épicerie' }], steps: ['Faire dorer les morceaux de bœuf', 'Ajouter oignon et carottes, faire revenir', 'Mouiller avec le vin, couvrir et laisser mijoter 40 min', 'Rectifier l\'assaisonnement avant de servir'], brandTip: 'Intermarché pour le bœuf à mijoter', mealType: ['diner'], goals: ['gourmand','protein'] },
  { id: 'r71', emoji: '🥗', name: 'Salade grecque', accent: '#10B981', photoQuery: 'greek salad feta', equipment: [], diets: ['vegetarien','sansgluten','halal','sansporc'], prepTime: 10, prefs: ['express'], base: 1.85,
    ingredients: [{ n:'Concombre', a:'Fruits & Légumes' },{ n:'Tomate', a:'Fruits & Légumes' },{ n:'Feta', a:'Frais' },{ n:'Olives', a:'Épicerie' }], steps: ['Couper le concombre et la tomate en gros dés', 'Ajouter la feta en cubes et les olives', 'Assaisonner d\'huile d\'olive et d\'origan', 'Mélanger délicatement'], brandTip: 'Carrefour Sélection pour la feta', mealType: ['dejeuner'], goals: ['healthy','rapide'] },
  { id: 'r72', emoji: '🍫', name: 'Overnight oats chocolat', accent: '#F59E0B', photoQuery: 'chocolate overnight oats jar', equipment: [], diets: ['vegetarien','vegetalien'], prepTime: 5, prefs: ['express'], base: 1.05,
    ingredients: [{ n:"Flocons d'avoine", a:'Épicerie' },{ n:'Lait végétal', a:'Épicerie' },{ n:'Cacao en poudre', a:'Épicerie' },{ n:'Miel', a:'Épicerie' }], steps: ["Mélanger les flocons d'avoine, le lait végétal et le cacao", 'Ajouter un filet de miel', 'Verser dans un bocal, couvrir', 'Laisser reposer au réfrigérateur toute la nuit'], brandTip: 'Alesto (Lidl) pour les flocons d\'avoine', mealType: ['petitdej'], goals: ['healthy','rapide'] },
  { id: 'r73', emoji: '🥞', name: 'Crêpes fines maison', accent: '#F59E0B', photoQuery: 'french crepes', equipment: ['poele'], diets: ['vegetarien'], prepTime: 15, prefs: ['express'], base: 1.0,
    ingredients: [{ n:'Farine', a:'Épicerie' },{ n:'Œufs', a:'Frais' },{ n:'Lait', a:'Frais' },{ n:'Sucre', a:'Épicerie' }], steps: ['Mélanger la farine, les œufs et le sucre', 'Ajouter le lait progressivement en fouettant', 'Laisser reposer la pâte 20 min si possible', 'Cuire chaque crêpe 1-2 min par face dans une poêle chaude'], brandTip: 'Marque Repère (Leclerc) pour la farine', mealType: ['petitdej'], goals: ['gourmand'] },
  { id: 'r74', emoji: '🥣', name: 'Granola maison croustillant', accent: '#F59E0B', photoQuery: 'homemade granola', equipment: ['four'], diets: ['vegetarien', 'vegetalien'], prepTime: 25, prefs: ['batch'], base: 1.2,
    ingredients: [{ n:'Flocons d\'avoine', a:'Épicerie' },{ n:'Miel', a:'Épicerie' },{ n:'Amandes', a:'Épicerie' },{ n:'Huile de coco', a:'Épicerie' }], steps: ['Mélanger les flocons d\'avoine, les amandes et l\'huile de coco', 'Ajouter le miel et bien enrober', 'Étaler sur une plaque, enfourner 20 min à 160°C en remuant à mi-cuisson', 'Laisser refroidir pour qu\'il devienne croustillant'], brandTip: 'Alesto (Lidl) pour les amandes', mealType: ['petitdej'], goals: ['healthy'] },
  { id: 'r75', emoji: '🥯', name: 'Bagel au saumon fumé', accent: '#0EA5E9', photoQuery: 'bagel smoked salmon', equipment: [], diets: ['sansporc', 'halal'], prepTime: 8, prefs: ['express'], base: 2.4,
    ingredients: [{ n:'Bagel', a:'Boulangerie' },{ n:'Saumon fumé', a:'Frais' },{ n:'Fromage frais', a:'Frais' },{ n:'Aneth', a:'Fruits & Légumes' }], steps: ['Couper le bagel en deux et le griller légèrement', 'Tartiner de fromage frais', 'Ajouter les tranches de saumon fumé', 'Parsemer d\'aneth frais'], brandTip: 'Auchan Marché du Frais pour le saumon fumé', mealType: ['petitdej'], goals: ['protein', 'gourmand'] },
  { id: 'r76', emoji: '🫐', name: 'Chia pudding aux fruits rouges', accent: '#0EA5E9', photoQuery: 'chia pudding berries', equipment: [], diets: ['vegetarien', 'vegetalien', 'sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 5, prefs: ['express'], base: 1.35,
    ingredients: [{ n:'Graines de chia', a:'Épicerie' },{ n:'Lait végétal', a:'Épicerie' },{ n:'Fruits rouges', a:'Fruits & Légumes' },{ n:'Miel', a:'Épicerie' }], steps: ['Mélanger les graines de chia avec le lait végétal', 'Laisser reposer au réfrigérateur au moins 3h (ou la nuit)', 'Ajouter les fruits rouges par-dessus', 'Terminer avec un filet de miel'], brandTip: 'Alesto (Lidl) pour les graines de chia', mealType: ['petitdej'], goals: ['healthy', 'rapide'] },
  { id: 'r77', emoji: '🥜', name: 'Toast banane et beurre de cacahuète', accent: '#F59E0B', photoQuery: 'peanut butter banana toast', equipment: [], diets: ['vegetarien', 'vegetalien'], prepTime: 5, prefs: ['express'], base: 1.15,
    ingredients: [{ n:'Pain complet', a:'Boulangerie' },{ n:'Beurre de cacahuète', a:'Épicerie' },{ n:'Banane', a:'Fruits & Légumes' },{ n:'Cannelle', a:'Épicerie' }], steps: ['Griller le pain complet', 'Tartiner de beurre de cacahuète', 'Ajouter la banane coupée en rondelles', 'Saupoudrer de cannelle'], brandTip: 'Nature\'s Pick (Aldi) pour le beurre de cacahuète', mealType: ['petitdej'], goals: ['healthy', 'rapide'] },
  { id: 'r78', emoji: '🐐', name: 'Omelette chèvre et miel', accent: '#10B981', photoQuery: 'goat cheese honey omelette', equipment: ['poele'], diets: ['vegetarien', 'sansgluten'], prepTime: 10, prefs: ['express'], base: 1.7,
    ingredients: [{ n:'Œufs', a:'Frais' },{ n:'Fromage de chèvre', a:'Frais' },{ n:'Miel', a:'Épicerie' },{ n:'Thym', a:'Épicerie' }], steps: ['Battre les œufs avec sel et poivre', 'Verser dans une poêle chaude', 'Ajouter le fromage de chèvre émietté', 'Plier l\'omelette, napper d\'un filet de miel et de thym'], brandTip: 'Pâturages (Intermarché) pour le chèvre', mealType: ['petitdej'], goals: ['gourmand'] },
  { id: 'r79', emoji: '🍫', name: 'Porridge protéiné au chocolat', accent: '#F59E0B', photoQuery: 'chocolate protein oatmeal', equipment: ['plaques'], diets: ['vegetarien'], prepTime: 8, prefs: ['express'], base: 1.45,
    ingredients: [{ n:'Flocons d\'avoine', a:'Épicerie' },{ n:'Lait', a:'Frais' },{ n:'Cacao en poudre', a:'Épicerie' },{ n:'Whey protéine', a:'Épicerie' }], steps: ['Faire chauffer le lait dans une casserole', 'Ajouter les flocons d\'avoine et le cacao, cuire 4 min', 'Incorporer la protéine en poudre hors du feu', 'Bien mélanger et servir chaud'], brandTip: 'Marque distributeur pour la whey', mealType: ['petitdej'], goals: ['protein', 'healthy'] },
  { id: 'r80', emoji: '🍓', name: 'Brioche perdue aux fruits', accent: '#F59E0B', photoQuery: 'brioche french toast fruit', equipment: ['poele'], diets: ['vegetarien'], prepTime: 12, prefs: ['express'], base: 1.4,
    ingredients: [{ n:'Brioche', a:'Boulangerie' },{ n:'Œufs', a:'Frais' },{ n:'Lait', a:'Frais' },{ n:'Fraises', a:'Fruits & Légumes' }], steps: ['Battre les œufs avec le lait', 'Tremper les tranches de brioche dans ce mélange', 'Faire dorer à la poêle 2 min par face', 'Servir avec les fraises coupées'], brandTip: 'Marque distributeur pour la brioche', mealType: ['petitdej'], goals: ['gourmand'] },
  { id: 'r81', emoji: '🌮', name: 'Enchiladas au poulet', accent: '#EF4444', photoQuery: 'chicken enchiladas', equipment: ['four'], diets: ['halal', 'sansporc'], prepTime: 35, prefs: ['batch'], base: 2.5,
    ingredients: [{ n:'Tortillas de blé', a:'Épicerie' },{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Sauce enchilada', a:'Épicerie' },{ n:'Cheddar', a:'Frais' }], steps: ['Faire cuire et émietter le poulet', 'Garnir chaque tortilla de poulet et rouler', 'Disposer dans un plat, napper de sauce et de cheddar', 'Enfourner 20 min à 190°C'], brandTip: 'Auchan pour la sauce enchilada', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r82', emoji: '🥘', name: 'Paella aux fruits de mer', accent: '#F59E0B', photoQuery: 'seafood paella', equipment: ['plaques'], diets: ['sanslactose', 'sansporc'], prepTime: 40, prefs: ['gourmand'], base: 3.3,
    ingredients: [{ n:'Riz rond', a:'Épicerie' },{ n:'Fruits de mer surgelés', a:'Surgelés' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Safran', a:'Épicerie' }], steps: ['Faire revenir le poivron émincé', 'Ajouter le riz et le safran, mélanger', 'Mouiller avec du bouillon, laisser absorber 18 min', 'Ajouter les fruits de mer les 5 dernières minutes'], brandTip: 'Vitasia ou Auchan pour les fruits de mer surgelés', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r83', emoji: '🍜', name: 'Ramen japonais au porc', accent: '#EF4444', photoQuery: 'japanese ramen pork broth', equipment: ['plaques'], diets: [], prepTime: 25, prefs: ['express'], base: 2.6,
    ingredients: [{ n:'Nouilles ramen', a:'Épicerie' },{ n:'Poitrine de porc', a:'Boucherie' },{ n:'Bouillon miso', a:'Épicerie' },{ n:'Œuf mollet', a:'Frais' }], steps: ['Préparer le bouillon miso chaud', 'Cuire les nouilles ramen selon le paquet', 'Faire revenir la poitrine de porc tranchée', 'Assembler dans un bol avec l\'œuf mollet'], brandTip: 'Vitasia (Lidl) pour les nouilles et le bouillon', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r84', emoji: '🍢', name: 'Tajine d\'agneau aux pruneaux', accent: '#F59E0B', photoQuery: 'lamb tagine prunes morocco', equipment: ['plaques'], diets: ['halal', 'sansporc', 'sanslactose'], prepTime: 50, prefs: ['batch', 'reheatable'], base: 3.4,
    ingredients: [{ n:'Épaule d\'agneau', a:'Boucherie' },{ n:'Pruneaux', a:'Épicerie' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Cannelle', a:'Épicerie' }], steps: ['Faire dorer les morceaux d\'agneau', 'Ajouter l\'oignon émincé et les épices', 'Mouiller et laisser mijoter 35 min à couvert', 'Ajouter les pruneaux les 10 dernières minutes'], brandTip: 'Boucherie halal locale conseillée pour l\'agneau', mealType: ['diner'], goals: ['gourmand', 'protein'] },
  { id: 'r85', emoji: '🫓', name: 'Manakish au za\'atar', accent: '#10B981', photoQuery: 'manakish zaatar flatbread', equipment: ['four'], diets: ['vegetarien', 'vegetalien', 'halal', 'sansporc'], prepTime: 20, prefs: ['express'], base: 1.1,
    ingredients: [{ n:'Pâte à pain', a:'Frais' },{ n:'Za\'atar', a:'Épicerie' },{ n:'Huile d\'olive', a:'Épicerie' },{ n:'Tomate', a:'Fruits & Légumes' }], steps: ['Étaler la pâte à pain finement', 'Mélanger le za\'atar avec l\'huile d\'olive', 'Étaler ce mélange sur la pâte', 'Enfourner 10-12 min à 220°C'], brandTip: 'Vitasia (Lidl) pour le za\'atar', mealType: ['dejeuner'], goals: ['gourmand', 'rapide'] },
  { id: 'r86', emoji: '🍲', name: 'Pho vietnamien au bœuf', accent: '#F59E0B', photoQuery: 'pho vietnamese beef soup', equipment: ['plaques'], diets: ['sanslactose', 'sansporc'], prepTime: 30, prefs: ['express'], base: 2.8,
    ingredients: [{ n:'Nouilles de riz', a:'Épicerie' },{ n:'Bœuf émincé', a:'Boucherie' },{ n:'Bouillon pho', a:'Épicerie' },{ n:'Coriandre', a:'Fruits & Légumes' }], steps: ['Préparer le bouillon pho selon le sachet', 'Cuire les nouilles de riz', 'Ajouter le bœuf émincé cru directement dans le bouillon chaud', 'Garnir de coriandre fraîche'], brandTip: 'Vitasia (Lidl) pour le bouillon pho', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r87', emoji: '🍝', name: 'Lasagnes à la bolognaise', accent: '#EF4444', photoQuery: 'lasagna bolognese', equipment: ['four'], diets: ['sansporc'], prepTime: 45, prefs: ['batch', 'reheatable'], base: 2.3,
    ingredients: [{ n:'Plaques de lasagnes', a:'Épicerie' },{ n:'Bœuf haché', a:'Boucherie' },{ n:'Sauce tomate', a:'Épicerie' },{ n:'Mozzarella', a:'Frais' }], steps: ['Préparer une sauce bolognaise avec le bœuf et la tomate', 'Alterner les couches de plaques, sauce et mozzarella', 'Terminer par une couche de fromage', 'Enfourner 30 min à 190°C'], brandTip: 'Carrefour Classic\' pour les plaques de lasagnes', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r88', emoji: '🥔', name: 'Tortilla espagnole', accent: '#F59E0B', photoQuery: 'spanish tortilla potato omelette', equipment: ['poele'], diets: ['vegetarien', 'sansgluten', 'halal', 'sansporc'], prepTime: 30, prefs: ['batch'], base: 1.35,
    ingredients: [{ n:'Pommes de terre', a:'Fruits & Légumes' },{ n:'Œufs', a:'Frais' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Huile d\'olive', a:'Épicerie' }], steps: ['Couper les pommes de terre en fines tranches', 'Les faire cuire doucement à l\'huile d\'olive avec l\'oignon', 'Battre les œufs et les mélanger aux pommes de terre', 'Cuire à la poêle 5 min par face à feu doux'], brandTip: 'Marque Repère (Leclerc) pour les pommes de terre', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r89', emoji: '🌶️', name: 'Poulet basquaise', accent: '#EF4444', photoQuery: 'chicken basquaise pepper tomato', equipment: ['plaques'], diets: ['sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 35, prefs: ['batch', 'reheatable'], base: 2.45,
    ingredients: [{ n:'Cuisses de poulet', a:'Boucherie' },{ n:'Poivron', a:'Fruits & Légumes' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Piment doux', a:'Épicerie' }], steps: ['Faire dorer les cuisses de poulet', 'Ajouter les poivrons émincés', 'Verser les tomates concassées et le piment doux', 'Laisser mijoter 25 min à couvert'], brandTip: 'Carrefour Bio pour les poivrons', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r90', emoji: '🦪', name: 'Moules marinières', accent: '#0EA5E9', photoQuery: 'mussels white wine marinara', equipment: ['plaques'], diets: ['sansgluten', 'sansporc'], prepTime: 20, prefs: ['express'], base: 2.2,
    ingredients: [{ n:'Moules fraîches', a:'Frais' },{ n:'Vin blanc à cuisiner', a:'Épicerie' },{ n:'Échalote', a:'Fruits & Légumes' },{ n:'Persil', a:'Fruits & Légumes' }], steps: ['Faire revenir l\'échalote émincée', 'Ajouter les moules nettoyées et le vin blanc', 'Couvrir et cuire 5-6 min jusqu\'à ouverture', 'Parsemer de persil frais'], brandTip: 'Auchan Marché du Frais pour les moules', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r91', emoji: '🍛', name: 'Curry de poulet et riz', accent: '#F59E0B', photoQuery: 'chicken curry rice', equipment: ['poele'], diets: ['halal', 'sansporc'], prepTime: 25, prefs: ['express'], base: 2.35,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Pâte de curry', a:'Épicerie' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Riz', a:'Épicerie' }], steps: ['Faire revenir le poulet coupé en dés', 'Ajouter la pâte de curry, mélanger 1 min', 'Verser le lait de coco, laisser mijoter 15 min', 'Servir avec du riz'], brandTip: 'Vitasia (Lidl) pour la pâte de curry', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r92', emoji: '🍚', name: 'Nasi goreng indonésien', accent: '#EF4444', photoQuery: 'nasi goreng fried rice indonesia', equipment: ['poele'], diets: ['sanslactose', 'sansporc'], prepTime: 18, prefs: ['express'], base: 1.95,
    ingredients: [{ n:'Riz', a:'Épicerie' },{ n:'Œufs', a:'Frais' },{ n:'Sauce soja sucrée', a:'Épicerie' },{ n:'Poivron', a:'Fruits & Légumes' }], steps: ['Cuire le riz puis le laisser refroidir', 'Faire sauter le poivron émincé', 'Ajouter le riz et la sauce soja sucrée, bien mélanger', 'Servir avec un œuf au plat par-dessus'], brandTip: 'Vitasia (Lidl) pour la sauce soja sucrée', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'rapide'] },
  { id: 'r93', emoji: '🍆', name: 'Curry d\'aubergines à l\'indienne', accent: '#10B981', photoQuery: 'indian eggplant curry', equipment: ['plaques'], diets: ['vegetarien', 'vegetalien', 'sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 25, prefs: ['batch', 'healthy'], base: 1.4,
    ingredients: [{ n:'Aubergine', a:'Fruits & Légumes' },{ n:'Tomates concassées', a:'Épicerie' },{ n:'Épices curry', a:'Épicerie' },{ n:'Ail', a:'Fruits & Légumes' }], steps: ['Couper l\'aubergine en dés et la faire revenir', 'Ajouter l\'ail émincé et les épices', 'Verser les tomates concassées', 'Laisser mijoter 15 min à couvert'], brandTip: 'Carrefour Bio pour l\'aubergine', mealType: ['dejeuner', 'diner'], goals: ['healthy'] },
  { id: 'r94', emoji: '🐟', name: 'Saumon teriyaki et riz', accent: '#0EA5E9', photoQuery: 'salmon teriyaki rice', equipment: ['poele'], diets: ['sanslactose', 'halal', 'sansporc'], prepTime: 18, prefs: ['express'], base: 3.15,
    ingredients: [{ n:'Pavé de saumon', a:'Frais' },{ n:'Sauce teriyaki', a:'Épicerie' },{ n:'Riz', a:'Épicerie' },{ n:'Graines de sésame', a:'Épicerie' }], steps: ['Cuire le riz', 'Saisir le saumon à la poêle 3 min par face', 'Ajouter la sauce teriyaki en fin de cuisson', 'Servir sur le riz, parsemer de sésame'], brandTip: 'Auchan Marché du Frais pour le saumon', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r95', emoji: '🥟', name: 'Empanadas au bœuf', accent: '#F59E0B', photoQuery: 'beef empanadas', equipment: ['four'], diets: ['sansporc'], prepTime: 35, prefs: ['batch'], base: 2.05,
    ingredients: [{ n:'Pâte à empanadas', a:'Frais' },{ n:'Bœuf haché', a:'Boucherie' },{ n:'Oignon', a:'Fruits & Légumes' },{ n:'Cumin', a:'Épicerie' }], steps: ['Faire revenir le bœuf haché avec l\'oignon et le cumin', 'Découper des cercles de pâte', 'Garnir et refermer en chausson', 'Enfourner 20 min à 200°C'], brandTip: 'Intermarché pour le bœuf haché', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r96', emoji: '🍗', name: 'Poulet aux épices marocaines', accent: '#F59E0B', photoQuery: 'moroccan spiced roast chicken', equipment: ['four'], diets: ['sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 45, prefs: ['batch', 'reheatable'], base: 2.75,
    ingredients: [{ n:'Cuisses de poulet', a:'Boucherie' },{ n:'Ras el hanout', a:'Épicerie' },{ n:'Citron', a:'Fruits & Légumes' },{ n:'Ail', a:'Fruits & Légumes' }], steps: ['Mariner le poulet avec le ras el hanout, l\'ail et le citron', 'Disposer sur une plaque', 'Enfourner 40 min à 200°C', 'Arroser du jus de cuisson à mi-cuisson'], brandTip: 'Vitasia (Lidl) pour le ras el hanout', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'protein'] },
  { id: 'r97', emoji: '🍅', name: 'Gnocchis sauce tomate basilic', accent: '#EF4444', photoQuery: 'gnocchi tomato basil', equipment: ['plaques'], diets: ['vegetarien'], prepTime: 12, prefs: ['express', 'rapide'], base: 1.5,
    ingredients: [{ n:'Gnocchis', a:'Épicerie' },{ n:'Sauce tomate', a:'Épicerie' },{ n:'Basilic', a:'Fruits & Légumes' },{ n:'Parmesan', a:'Frais' }], steps: ['Cuire les gnocchis dans l\'eau bouillante', 'Réchauffer la sauce tomate', 'Mélanger les gnocchis égouttés à la sauce', 'Parsemer de basilic frais et de parmesan'], brandTip: 'Carrefour Classic\' pour les gnocchis', mealType: ['dejeuner', 'diner'], goals: ['gourmand', 'rapide'] },
  { id: 'r98', emoji: '🍤', name: 'Curry de crevettes au coco', accent: '#0EA5E9', photoQuery: 'shrimp coconut curry', equipment: ['plaques'], diets: ['sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 20, prefs: ['express'], base: 2.85,
    ingredients: [{ n:'Crevettes', a:'Frais' },{ n:'Lait de coco', a:'Épicerie' },{ n:'Pâte de curry rouge', a:'Épicerie' },{ n:'Coriandre', a:'Fruits & Légumes' }], steps: ['Faire chauffer la pâte de curry rouge', 'Ajouter le lait de coco, laisser mijoter 5 min', 'Ajouter les crevettes, cuire 4-5 min', 'Parsemer de coriandre fraîche'], brandTip: 'Vitasia (Lidl) pour la pâte de curry rouge', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r99', emoji: '🥢', name: 'Poulet façon general tso', accent: '#EF4444', photoQuery: 'general tso chicken', equipment: ['poele'], diets: ['halal', 'sansporc', 'sanslactose'], prepTime: 22, prefs: ['express'], base: 2.3,
    ingredients: [{ n:'Blanc de poulet', a:'Boucherie' },{ n:'Sauce soja', a:'Épicerie' },{ n:'Miel', a:'Épicerie' },{ n:'Graines de sésame', a:'Épicerie' }], steps: ['Couper le poulet en morceaux et le faire dorer', 'Préparer la sauce avec soja, miel et un peu de piment', 'Napper le poulet de sauce, laisser réduire 3 min', 'Parsemer de graines de sésame'], brandTip: 'Vitasia (Lidl) pour la sauce soja', mealType: ['dejeuner', 'diner'], goals: ['gourmand'] },
  { id: 'r100', emoji: '🥗', name: 'Salade de lentilles et légumes rôtis', accent: '#10B981', photoQuery: 'lentil salad roasted vegetables', equipment: ['four'], diets: ['vegetarien', 'vegetalien', 'sansgluten', 'sanslactose', 'halal', 'sansporc'], prepTime: 30, prefs: ['batch', 'healthy'], base: 1.6,
    ingredients: [{ n:'Lentilles', a:'Épicerie' },{ n:'Courgette', a:'Fruits & Légumes' },{ n:'Carottes', a:'Fruits & Légumes' },{ n:'Huile d\'olive', a:'Épicerie' }], steps: ['Couper les légumes et les enfourner 25 min à 200°C avec de l\'huile d\'olive', 'Cuire les lentilles selon le paquet', 'Mélanger les lentilles tièdes avec les légumes rôtis', 'Assaisonner généreusement'], brandTip: 'Carrefour Bio pour les lentilles', mealType: ['dejeuner', 'diner'], goals: ['healthy'] },
];
RECIPES.forEach(r => { r.prices = priceMap(r.base); });

const AISLE_ORDER = ['Fruits & Légumes', 'Boucherie', 'Frais', 'Épicerie', 'Surgelés'];

function fmtEuro(n) { return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }

// Petit generateur pseudo-aleatoire deterministe (meme id = toujours le meme rendu, mais different d'un plat a l'autre)
function seededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function hashId(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; return h; }
function shiftHue(hex, deg) {
  const r = parseInt(hex.slice(1,3),16)/255, g = parseInt(hex.slice(3,5),16)/255, b = parseInt(hex.slice(5,7),16)/255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b); let h, s, l = (max+min)/2;
  if (max === min) { h = s = 0; } else {
    const d = max-min; s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    h = max===r ? ((g-b)/d + (g<b?6:0)) : max===g ? (b-r)/d+2 : (r-g)/d+4; h/=6;
  }
  h = (h + deg/360) % 1; if (h < 0) h += 1;
  const hue2rgb = (p,q,t) => { if (t<0)t+=1; if (t>1)t-=1; if (t<1/6)return p+(q-p)*6*t; if (t<1/2)return q; if (t<2/3)return p+(q-p)*(2/3-t)*6; return p; };
  const q = l < 0.5 ? l*(1+s) : l+s-l*s, p = 2*l-q;
  const rr = Math.round(hue2rgb(p,q,h+1/3)*255), gg = Math.round(hue2rgb(p,q,h)*255), bb = Math.round(hue2rgb(p,q,h-1/3)*255);
  return `rgb(${rr},${gg},${bb})`;
}

// Illustration de plat : bol + "aliments" colores generes de facon deterministe selon l'id de la recette
// ---------------------------------------------------------------------------
// VRAIES PHOTOS DE PLATS (via l'API Pexels — gratuite, libre de droits)
// Colle ta cle API Pexels ci-dessous (https://www.pexels.com/api/, gratuit, 2 min).
// Tant qu'aucune cle n'est renseignee, ou si une requete echoue, l'illustration
// dessinee (DishArt) s'affiche a la place — l'appli fonctionne dans tous les cas.
// ---------------------------------------------------------------------------
const PEXELS_API_KEY = ''; // <- colle ta cle ici, entre les guillemets

const photoCache = {}; // evite de refaire la meme requete plusieurs fois pour le meme plat

function useDishPhoto(recipe) {
  const [url, setUrl] = useState(photoCache[recipe.id] || null);
  const [failed, setFailed] = useState(!PEXELS_API_KEY);

  React.useEffect(() => {
    if (!PEXELS_API_KEY || photoCache[recipe.id] !== undefined) return;
    let cancelled = false;
    const query = recipe.photoQuery || recipe.name;
    fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=square`, {
      headers: { Authorization: PEXELS_API_KEY }
    })
      .then(r => { if (!r.ok) throw new Error('pexels_error'); return r.json(); })
      .then(data => {
        const photo = data.photos && data.photos[0];
        const found = photo ? (photo.src.medium || photo.src.small) : null;
        photoCache[recipe.id] = found;
        if (!cancelled) { if (found) setUrl(found); else setFailed(true); }
      })
      .catch(() => { photoCache[recipe.id] = null; if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [recipe.id]);

  return { url, failed };
}

// Affiche la vraie photo si disponible, sinon l'illustration dessinee — jamais d'espace vide
function DishImage({ recipe, size = 96, rounded = 'rounded-2xl' }) {
  const { url, failed } = useDishPhoto(recipe);
  if (url) return <img src={url} alt={recipe.name} className={`h-full w-full object-cover ${rounded}`} loading="lazy" />;
  if (failed) return <DishArt recipe={recipe} size={size} />;
  return <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />;
}

function DishArt({ recipe, size = 96 }) {
  const rand = seededRandom(hashId(recipe.id));
  const blobs = useMemo(() => {
    const n = 3 + Math.floor(rand() * 2); // 3 ou 4 "aliments"
    const colors = [recipe.accent, shiftHue(recipe.accent, 28), shiftHue(recipe.accent, -24), shiftHue(recipe.accent, 50)];
    return Array.from({ length: n }).map((_, i) => ({
      cx: 30 + rand() * 40, cy: 34 + rand() * 30,
      rx: 12 + rand() * 10, ry: 9 + rand() * 8,
      rot: rand() * 60 - 30,
      color: colors[i % colors.length],
    }));
  }, [recipe.id]);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="drop-shadow-sm">
      <ellipse cx="50" cy="74" rx="38" ry="7" fill="#00000012" />
      <ellipse cx="50" cy="58" rx="44" ry="30" fill="#FAFAF8" stroke="#00000008" strokeWidth="1.5" />
      <ellipse cx="50" cy="56" rx="36" ry="24" fill="#F1F0EC" />
      {blobs.map((b, i) => (
        <ellipse key={i} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={b.color} opacity="0.92" transform={`rotate(${b.rot} ${b.cx} ${b.cy})`} />
      ))}
      <circle cx="50" cy="24" r="13" fill="#fff" stroke="#00000010" strokeWidth="1" />
      <text x="50" y="29" textAnchor="middle" fontSize="15">{recipe.emoji}</text>
    </svg>
  );
}

// Melange aleatoire (Fisher-Yates) — chaque appel donne un ordre different
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function matchesDislikes(recipe, dislikes) {
  if (!dislikes || !dislikes.length) return false;
  const lowerDislikes = dislikes.map(d => d.toLowerCase());
  return recipe.ingredients.some(ing => lowerDislikes.some(d => ing.n.toLowerCase().includes(d)));
}

// Prix le moins cher parmi les enseignes choisies par l'utilisateur (ou toutes si aucune choisie)
function cheapestPrice(recipe, stores) {
  const candidates = stores && stores.length ? stores : Object.keys(recipe.prices);
  return candidates.reduce((min, s) => Math.min(min, recipe.prices[s] ?? Infinity), Infinity);
}

function scoreRecipe(recipe, data, budgetPerPortion) {
  let score = 0;
  score += data.prefs.filter(p => recipe.prefs.includes(p)).length * 2;
  score += data.goals.filter(g => recipe.goals.includes(g)).length * 2;
  if (budgetPerPortion && budgetPerPortion > 0) {
    const price = cheapestPrice(recipe, data.stores);
    if (price <= budgetPerPortion) score += 3; // bonus net pour les recettes qui tiennent dans le budget
    else score -= Math.min(6, ((price - budgetPerPortion) / budgetPerPortion) * 6); // penalite si ca depasse
  }
  return score;
}

// Construit un menu : respecte equipement/regimes (obligatoires), evite les aliments detestes,
// favorise (sans jamais garantir) les recettes qui correspondent aux objectifs/preferences ET AU BUDGET,
// et melange aleatoirement a chaque generation pour ne jamais proposer toujours le meme menu.
function buildPlan(data) {
  const mealTypes = data.mealTypes.length ? data.mealTypes : ['dejeuner', 'diner'];
  const plan = [];
  const totalMeals = data.days * mealTypes.length;
  const people = data.adults + data.children * 0.6;
  // Budget par portion, par repas : ce que chaque repas peut couter au maximum pour rester dans l'enveloppe fixee
  const budgetPerPortion = totalMeals > 0 && people > 0 ? data.budget / totalMeals / people : 0;

  mealTypes.forEach(mealType => {
    const hardFilter = (r, withDislikes) =>
      r.mealType.includes(mealType) &&
      r.equipment.every(e => data.equipment.includes(e)) &&
      data.diets.every(d => r.diets.includes(d)) &&
      (!withDislikes || !matchesDislikes(r, data.dislikes));

    let pool = RECIPES.filter(r => hardFilter(r, true));
    if (pool.length === 0) pool = RECIPES.filter(r => hardFilter(r, false)); // on relache les aliments detestes si besoin
    if (pool.length === 0) pool = RECIPES.filter(r => r.equipment.every(e => data.equipment.includes(e)) && r.mealType.includes(mealType)); // on relache les regimes en dernier recours
    if (pool.length === 0) pool = RECIPES.filter(r => r.equipment.every(e => data.equipment.includes(e))); // aucune recette pour ce type de repas : on pioche dans le reste

    // Melange puis trie par score (preferences + objectifs + respect du budget) — les ex-aequo restent
    // donc dans un ordre different a chaque fois
    const ranked = shuffle(pool).sort((a, b) => scoreRecipe(b, data, budgetPerPortion) - scoreRecipe(a, data, budgetPerPortion));

    // Tire "days" recettes en respectant l'ordre de score, en evitant les repetitions autant que possible
    const chosen = [];
    let cycle = [...ranked];
    for (let i = 0; i < data.days; i++) {
      if (cycle.length === 0) cycle = shuffle(ranked); // si on doit repasser par le pool, on re-brasse l'ordre
      chosen.push(cycle.shift());
    }
    plan.push(...chosen);
  });

  return plan;
}

// Le plan est stocke comme une liste a plat, concatenee par type de repas
// (tous les petit-dej, puis tous les dejeuners, puis tous les diners).
// Ces deux fonctions permettent d'afficher soit groupe par type de repas,
// soit reorganise jour par jour — sans jamais recalculer ou perdre les index d'origine.
function groupByMealType(plan, mealTypes, days) {
  const groups = [];
  let cursor = 0;
  mealTypes.forEach(mt => {
    const items = [];
    for (let i = 0; i < days; i++) { items.push({ index: cursor, recipe: plan[cursor] }); cursor++; }
    groups.push({ mealType: mt, items });
  });
  return groups;
}

function groupByDay(plan, mealTypes, days) {
  const byType = groupByMealType(plan, mealTypes, days);
  const daysArr = [];
  for (let d = 0; d < days; d++) {
    const slots = mealTypes.map((mt, mi) => ({ mealType: mt, ...byType[mi].items[d] }));
    daysArr.push({ day: d + 1, slots });
  }
  return daysArr;
}

/* =========================================================================
   COMPOSANTS UI DE BASE
   ========================================================================= */
function ProgressBar({ step, total }) {
  return (
    <div className="flex items-center gap-2 mb-10">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
          />
        </div>
      ))}
    </div>
  );
}

function Badge({ active, onClick, icon: Icon, label, sub, dotColor }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all duration-200 ${
        active
          ? 'border-emerald-500 bg-emerald-50/80 shadow-sm ring-1 ring-emerald-500/20'
          : 'border-slate-200/70 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {active && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm animate-[popIn_0.25s_ease-out]">
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
      {dotColor && (
        <span className="flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white" style={{ background: dotColor }}>
          {label.slice(0, 1)}
        </span>
      )}
      {Icon && <Icon className={`h-6 w-6 transition-colors ${active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-500'}`} strokeWidth={1.75} />}
      <span className={`text-sm font-medium ${active ? 'text-emerald-900' : 'text-slate-700'}`}>{label}</span>
      {sub && <span className="text-xs text-slate-400 -mt-1">{sub}</span>}
    </button>
  );
}

function StepShell({ eyebrow, title, sub, children, onBack, onNext, nextLabel, nextDisabled }) {
  return (
    <div className="animate-[stepIn_0.35s_ease-out]">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-2">{eyebrow}</p>
      <h2 className="text-2xl font-bold text-slate-900 mb-1.5">{title}</h2>
      <p className="text-sm text-slate-500 mb-8">{sub}</p>
      {children}
      <div className="flex items-center justify-between mt-10">
        {onBack ? (
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-2 py-2">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
        ) : <span />}
        <button
          onClick={onNext}
          disabled={nextDisabled}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md active:scale-[0.97] disabled:opacity-30 disabled:pointer-events-none"
        >
          {nextLabel || 'Continuer'} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   ETAPE 1 — LOCALISATION & ENSEIGNES
   ========================================================================= */
// Departements francais (donnee publique fiable) — utilise juste pour afficher la region
// reconnue et suggerer les enseignes les plus repandues nationalement. Ce n'est PAS un
// veritable localisateur de magasins en temps reel (aucune API gratuite fiable ne permet
// de faire ca honnetement sans risquer de donner de fausses informations).
const DEPARTEMENTS = {
  '01':'Ain','02':'Aisne','03':'Allier','04':'Alpes-de-Haute-Provence','05':'Hautes-Alpes','06':'Alpes-Maritimes','07':'Ardèche','08':'Ardennes','09':'Ariège','10':'Aube',
  '11':'Aude','12':'Aveyron','13':'Bouches-du-Rhône','14':'Calvados','15':'Cantal','16':'Charente','17':'Charente-Maritime','18':'Cher','19':'Corrèze',
  '21':'Côte-d\'Or','22':'Côtes-d\'Armor','23':'Creuse','24':'Dordogne','25':'Doubs','26':'Drôme','27':'Eure','28':'Eure-et-Loir','29':'Finistère',
  '30':'Gard','31':'Haute-Garonne','32':'Gers','33':'Gironde','34':'Hérault','35':'Ille-et-Vilaine','36':'Indre','37':'Indre-et-Loire','38':'Isère','39':'Jura',
  '40':'Landes','41':'Loir-et-Cher','42':'Loire','43':'Haute-Loire','44':'Loire-Atlantique','45':'Loiret','46':'Lot','47':'Lot-et-Garonne','48':'Lozère','49':'Maine-et-Loire',
  '50':'Manche','51':'Marne','52':'Haute-Marne','53':'Mayenne','54':'Meurthe-et-Moselle','55':'Meuse','56':'Morbihan','57':'Moselle','58':'Nièvre','59':'Nord',
  '60':'Oise','61':'Orne','62':'Pas-de-Calais','63':'Puy-de-Dôme','64':'Pyrénées-Atlantiques','65':'Hautes-Pyrénées','66':'Pyrénées-Orientales','67':'Bas-Rhin','68':'Haut-Rhin','69':'Rhône',
  '70':'Haute-Saône','71':'Saône-et-Loire','72':'Sarthe','73':'Savoie','74':'Haute-Savoie','75':'Paris','76':'Seine-Maritime','77':'Seine-et-Marne','78':'Yvelines','79':'Deux-Sèvres',
  '80':'Somme','81':'Tarn','82':'Tarn-et-Garonne','83':'Var','84':'Vaucluse','85':'Vendée','86':'Vienne','87':'Haute-Vienne','88':'Vosges','89':'Yonne',
  '90':'Territoire de Belfort','91':'Essonne','92':'Hauts-de-Seine','93':'Seine-Saint-Denis','94':'Val-de-Marne','95':'Val-d\'Oise',
};
// Les 4 enseignes ayant la plus large couverture nationale en France, tous departements confondus
const CHAINS_NATIONWIDE = ['carrefour', 'leclerc', 'intermarche', 'lidl'];

function Step1({ data, setData, onNext }) {
  const toggleStore = (id) => {
    setData(d => ({ ...d, stores: d.stores.includes(id) ? d.stores.filter(s => s !== id) : [...d.stores, id] }));
  };
  const dept = /^\d{5}$/.test(data.location.trim()) ? DEPARTEMENTS[data.location.trim().slice(0, 2)] : null;
  const applySuggestion = () => setData(d => ({ ...d, stores: [...new Set([...d.stores, ...CHAINS_NATIONWIDE])] }));
  return (
    <StepShell
      eyebrow="Étape 1 sur 4" title="Où fais-tu tes courses ?"
      sub="Choisis ta zone et les enseignes que tu fréquentes, pour comparer les prix au plus juste."
      onNext={onNext} nextDisabled={data.stores.length === 0}
    >
      <div className="relative mb-3">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={data.location}
          onChange={e => setData(d => ({ ...d, location: e.target.value }))}
          placeholder="Ville ou code postal (ex: Lyon, 69003)"
          className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
        />
      </div>
      {dept && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3 mb-6 animate-[stepIn_0.25s_ease-out]">
          <p className="text-xs text-emerald-800"><b className="font-semibold">{dept}</b> — voici les enseignes les plus répandues en France, tu peux ajuster ensuite.</p>
          <button onClick={applySuggestion} className="flex-none text-xs font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-900">Ajouter</button>
        </div>
      )}
      <p className="text-xs font-semibold text-slate-500 mb-3">SUPERMARCHÉS À PROXIMITÉ</p>
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {SUPERMARKETS.map(s => (
          <Badge key={s.id} active={data.stores.includes(s.id)} onClick={() => toggleStore(s.id)} label={s.name} dotColor={s.color} />
        ))}
      </div>
    </StepShell>
  );
}

/* =========================================================================
   ETAPE 2 — BUDGET & FAMILLE
   ========================================================================= */
function Step2({ data, setData, onNext, onBack }) {
  const totalMeals = data.days * Math.max(1, data.mealTypes.length);
  const perPerson = data.budget / Math.max(1, data.adults + data.children * 0.6) / Math.max(1, totalMeals);
  const Counter = ({ label, value, onDec, onInc, min = 0, icon: Icon }) => (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={onDec} disabled={value <= min} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-colors">−</button>
        <span className="w-6 text-center text-sm font-semibold text-slate-900">{value}</span>
        <button onClick={onInc} className="h-8 w-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">+</button>
      </div>
    </div>
  );
  return (
    <StepShell
      eyebrow="Étape 2 sur 4" title="Ton budget et ta famille"
      sub="On ajuste automatiquement les quantités et le coût par repas."
      onBack={onBack} onNext={onNext}
    >
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-2"><Wallet className="h-4 w-4 text-slate-400" /> Budget hebdomadaire</span>
          <span className="text-lg font-bold text-emerald-600">{fmtEuro(data.budget)}</span>
        </div>
        <input
          type="range" min="20" max="200" step="5" value={data.budget}
          onChange={e => setData(d => ({ ...d, budget: Number(e.target.value) }))}
          className="w-full h-2 rounded-full bg-slate-100 accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>20 €</span>
          <span className="font-medium text-slate-500">≈ {fmtEuro(perPerson)} / repas / personne</span>
          <span>200 €</span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <Counter label="Adultes" value={data.adults} icon={Users} min={1}
          onDec={() => setData(d => ({ ...d, adults: Math.max(1, d.adults - 1) }))}
          onInc={() => setData(d => ({ ...d, adults: d.adults + 1 }))} />
        <Counter label="Enfants" value={data.children} icon={Baby} min={0}
          onDec={() => setData(d => ({ ...d, children: Math.max(0, d.children - 1) }))}
          onInc={() => setData(d => ({ ...d, children: d.children + 1 }))} />
      </div>
      <Counter label="Nombre de jours à planifier" value={data.days} icon={UtensilsCrossed} min={3}
        onDec={() => setData(d => ({ ...d, days: Math.max(3, d.days - 1) }))}
        onInc={() => setData(d => ({ ...d, days: Math.min(7, d.days + 1) }))} />
      <p className="text-xs font-semibold text-slate-500 mt-6 mb-3">REPAS À PRÉVOIR CHAQUE JOUR</p>
      <div className="grid grid-cols-3 gap-3">
        {MEAL_TYPES.map(mt => (
          <Badge key={mt.id} active={data.mealTypes.includes(mt.id)} icon={mt.icon} label={mt.name}
            onClick={() => setData(d => ({ ...d, mealTypes: d.mealTypes.includes(mt.id) ? d.mealTypes.filter(x => x !== mt.id) : [...d.mealTypes, mt.id] }))} />
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3">Soit <b className="text-slate-600">{data.days * Math.max(1, data.mealTypes.length)} repas</b> au total sur la semaine.</p>
    </StepShell>
  );
}

/* =========================================================================
   ETAPE 3 — EQUIPEMENT
   ========================================================================= */
function Step3({ data, setData, onNext, onBack }) {
  const toggle = (id) => setData(d => ({ ...d, equipment: d.equipment.includes(id) ? d.equipment.filter(e => e !== id) : [...d.equipment, id] }));
  return (
    <StepShell
      eyebrow="Étape 3 sur 4" title="Ton matériel de cuisine"
      sub="On ne proposera que des recettes réalisables avec ce que tu as vraiment sous la main."
      onBack={onBack} onNext={onNext} nextDisabled={data.equipment.length === 0}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {EQUIPMENT.map(e => (
          <Badge key={e.id} active={data.equipment.includes(e.id)} onClick={() => toggle(e.id)} icon={e.icon} label={e.name} />
        ))}
      </div>
    </StepShell>
  );
}

/* =========================================================================
   ETAPE 4 — REGIMES & PREFERENCES
   ========================================================================= */
function Step4({ data, setData, onGenerate, onBack }) {
  const toggleDiet = (id) => setData(d => ({ ...d, diets: d.diets.includes(id) ? d.diets.filter(x => x !== id) : [...d.diets, id] }));
  const togglePref = (id) => setData(d => ({ ...d, prefs: d.prefs.includes(id) ? d.prefs.filter(x => x !== id) : [...d.prefs, id] }));
  const toggleGoal = (id) => setData(d => ({ ...d, goals: d.goals.includes(id) ? d.goals.filter(x => x !== id) : [...d.goals, id] }));
  const [dislikeInput, setDislikeInput] = useState('');
  const addDislike = () => {
    const v = dislikeInput.trim();
    if (!v || data.dislikes.some(x => x.toLowerCase() === v.toLowerCase())) { setDislikeInput(''); return; }
    setData(d => ({ ...d, dislikes: [...d.dislikes, v] }));
    setDislikeInput('');
  };
  const removeDislike = (v) => setData(d => ({ ...d, dislikes: d.dislikes.filter(x => x !== v) }));
  return (
    <StepShell
      eyebrow="Étape 4 sur 4" title="Régimes et préférences"
      sub="Dernière étape avant de générer ton menu sur mesure."
      onBack={onBack} onNext={onGenerate} nextLabel="Générer mon menu"
    >
      <p className="text-xs font-semibold text-slate-500 mb-3">RÉGIMES & ALLERGIES</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {DIETS.map(d => <Badge key={d.id} active={data.diets.includes(d.id)} onClick={() => toggleDiet(d.id)} icon={d.icon} label={d.name} />)}
      </div>
      <p className="text-xs font-semibold text-slate-500 mb-3">OBJECTIFS DU MENU</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {GOALS.map(g => <Badge key={g.id} active={data.goals.includes(g.id)} onClick={() => toggleGoal(g.id)} icon={g.icon} label={g.name} sub={g.desc} />)}
      </div>
      <p className="text-xs font-semibold text-slate-500 mb-3">PRÉFÉRENCES DE PRÉPARATION</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {PREFS.map(p => <Badge key={p.id} active={data.prefs.includes(p.id)} onClick={() => togglePref(p.id)} icon={p.icon} label={p.name} sub={p.desc} />)}
      </div>
      <p className="text-xs font-semibold text-slate-500 mb-3">ALIMENTS QUE TU N'AIMES PAS</p>
      <div className="flex gap-2 mb-3">
        <input
          value={dislikeInput} onChange={e => setDislikeInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDislike(); } }}
          placeholder="Ex: champignons, coriandre..."
          className="flex-1 rounded-xl border border-slate-200 bg-white py-3 px-4 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
        />
        <button onClick={addDislike} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"><Plus className="h-4 w-4" /> Ajouter</button>
      </div>
      {data.dislikes.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {data.dislikes.map(v => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-100 px-3 py-1.5 text-xs font-medium text-red-700">
              {v}
              <button onClick={() => removeDislike(v)} className="text-red-400 hover:text-red-600"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <label className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 cursor-pointer">
        <input type="checkbox" checked={data.antiWaste} onChange={e => setData(d => ({ ...d, antiWaste: e.target.checked }))}
          className="h-4 w-4 rounded accent-emerald-500" />
        <div>
          <p className="text-sm font-medium text-slate-700">Anti-gaspillage intelligent</p>
          <p className="text-xs text-slate-400">Réutilise les ingrédients similaires d'une recette à l'autre pour réduire la liste de courses.</p>
        </div>
      </label>
    </StepShell>
  );
}

/* =========================================================================
   CHARGEMENT (SKELETON)
   ========================================================================= */
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-[stepIn_0.3s_ease-out]">
      <div className="relative h-16 w-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        <ChefHat className="absolute inset-0 m-auto h-6 w-6 text-emerald-600" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">Optimisation de ton menu en cours...</p>
      <p className="text-xs text-slate-400 mb-10">Comparaison des prix sur {SUPERMARKETS.length} enseignes</p>
      <div className="w-full max-w-sm space-y-3">
        {[0,1,2].map(i => (
          <div key={i} className="h-16 rounded-2xl bg-slate-100 overflow-hidden relative">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   TABLEAU DE BORD — RESULTATS
   ========================================================================= */
function SavingsGauge({ budget, actual, classic }) {
  const isOver = actual > budget;
  const pct = Math.min(100, (actual / budget) * 100);
  const savings = Math.max(0, classic - actual);
  const overshoot = Math.max(0, actual - budget);
  const radius = 70, stroke = 12, circ = 2 * Math.PI * radius;
  const [animatedPct, setAnimatedPct] = useState(0);
  React.useEffect(() => { const t = setTimeout(() => setAnimatedPct(pct), 150); return () => clearTimeout(t); }, [pct]);
  const ringColor = isOver ? '#EF4444' : '#10B981';
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-8">
      <div className="relative h-44 w-44 flex-none">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
          <circle
            cx="90" cy="90" r={radius} fill="none" stroke={ringColor} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ - (animatedPct / 100) * circ}
            className="transition-all duration-[1200ms] ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${isOver ? 'text-red-600' : 'text-slate-900'}`}>{fmtEuro(actual)}</span>
          <span className="text-xs text-slate-400">sur {fmtEuro(budget)} prévus</span>
        </div>
      </div>
      <div className="flex-1 text-center sm:text-left">
        {isOver ? (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 mb-3">
              <AlertCircle className="h-3.5 w-3.5 text-red-600" />
              <span className="text-xs font-semibold text-red-700">Budget dépassé</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">{fmtEuro(overshoot)} au-dessus de ton budget</p>
            <p className="text-sm text-slate-500">Essaie de remplacer une recette par une moins chère (bouton ↻ sur une carte), ou d'ajouter d'autres enseignes à l'étape 1.</p>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 mb-3">
              <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
              <span className="text-xs font-semibold text-emerald-700">Dans ton budget</span>
            </div>
            <p className="text-2xl font-bold text-slate-900 mb-1">Tu économises {fmtEuro(savings)}</p>
            <p className="text-sm text-slate-500">par rapport à un panier classique dans une seule grande enseigne, en répartissant tes achats sur les enseignes que tu as sélectionnées.</p>
          </>
        )}
      </div>
    </div>
  );
}

function RecipeCard({ recipe, cheapestStore, onOpen, onReplace }) {
  const [flipping, setFlipping] = useState(false);
  const handleReplace = (e) => {
    e.stopPropagation();
    setFlipping(true);
    setTimeout(() => { onReplace(); setFlipping(false); }, 280);
  };
  return (
    <div
      onClick={onOpen}
      className={`group relative cursor-pointer rounded-2xl border border-slate-200/70 bg-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${flipping ? '[transform:rotateY(90deg)] opacity-0' : '[transform:rotateY(0deg)] opacity-100'}`}
      style={{ transitionProperty: 'transform, opacity, box-shadow' }}
    >
      <div className="h-32 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(150deg, ${recipe.accent}1a, ${recipe.accent}06 60%)` }}>
        <div className="h-full w-full transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
          <DishImage recipe={recipe} size={92} rounded="rounded-none" />
        </div>
        <button
          onClick={handleReplace}
          title="Remplacer cette recette"
          className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:bg-white hover:text-emerald-600"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="p-4">
        <h4 className="text-sm font-semibold text-slate-800 leading-snug mb-2 line-clamp-2">{recipe.name}</h4>
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-3">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {recipe.prepTime} min</span>
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
            {fmtEuro(recipe.prices[cheapestStore])} <span className="text-slate-400 font-normal">/ portion</span>
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-500 capitalize">{SUPERMARKETS.find(s => s.id === cheapestStore)?.name}</span>
          <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  );
}

function RecipeModal({ recipe, cheapestStore, onClose }) {
  if (!recipe) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-[fadeIn_0.25s_ease-out]" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[88vh] rounded-t-[28px] sm:rounded-[28px] bg-white flex flex-col overflow-hidden shadow-2xl animate-[modalRise_0.35s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {/* Petite poignee visuelle mobile, purement decorative */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center flex-none">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>
        {/* Bouton fermer : toujours visible, quel que soit le defilement du contenu en dessous */}
        <button onClick={onClose} className="absolute top-4 right-4 z-20 rounded-full bg-white/95 p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 hover:rotate-90 transition-all duration-300 shadow-lg">
          <X className="h-4 w-4" />
        </button>

        <div className="overflow-y-auto flex-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
          <div className="relative h-44 flex items-center justify-center overflow-hidden" style={{ background: `linear-gradient(150deg, ${recipe.accent}22, ${recipe.accent}06 65%)` }}>
            <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 20%, ${recipe.accent}30, transparent 60%)` }} />
            <div className="relative animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
              <DishImage recipe={recipe} size={136} rounded="rounded-none" />
            </div>
          </div>

          <div className="p-6 sm:p-7 pt-6">
            <h3 className="text-xl font-bold text-slate-900 mb-3 leading-snug animate-[fadeSlideIn_0.4s_ease-out_0.05s_both]">{recipe.name}</h3>

            <div className="flex flex-wrap items-center gap-2 mb-5 animate-[fadeSlideIn_0.4s_ease-out_0.1s_both]">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500"><Clock className="h-3 w-3" /> {recipe.prepTime} min</span>
              {recipe.equipment.map(eq => {
                const e = EQUIPMENT.find(x => x.id === eq);
                return <span key={eq} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-500"><e.icon className="h-3 w-3" /> {e.name}</span>;
              })}
            </div>

            <div className="rounded-2xl bg-emerald-50/80 p-4 mb-5 flex items-center justify-between animate-[fadeSlideIn_0.4s_ease-out_0.15s_both]">
              <span className="text-sm text-emerald-800">Meilleur prix chez <b>{SUPERMARKETS.find(s => s.id === cheapestStore)?.name}</b></span>
              <span className="text-lg font-bold text-emerald-700">{fmtEuro(recipe.prices[cheapestStore])}</span>
            </div>

            <p className="text-xs font-semibold text-slate-500 mb-3 animate-[fadeSlideIn_0.4s_ease-out_0.18s_both]">INGRÉDIENTS</p>
            <ul className="space-y-2 mb-4 animate-[fadeSlideIn_0.4s_ease-out_0.2s_both]">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 flex-none" /> {ing.n} <span className="text-slate-300">·</span> <span className="text-slate-400">{ing.a}</span>
                </li>
              ))}
            </ul>

            {recipe.brandTip && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 p-3.5 mb-6 animate-[fadeSlideIn_0.4s_ease-out_0.25s_both]">
                <Star className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-none" />
                <p className="text-xs text-amber-800"><b className="font-semibold">Bon plan marque : </b>{recipe.brandTip}<span className="block text-amber-600/70 mt-0.5">Suggestion à titre indicatif, pas un prix garanti en magasin.</span></p>
              </div>
            )}

            {recipe.steps && (
              <div className="animate-[fadeSlideIn_0.4s_ease-out_0.3s_both]">
                <p className="text-xs font-semibold text-slate-500 mb-3">ÉTAPES DE PRÉPARATION</p>
                <ol className="space-y-3 mb-6">
                  {recipe.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold" style={{ background: `${recipe.accent}1f`, color: recipe.accent }}>{i + 1}</span>
                      <span className="pt-0.5">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-500 mb-3 animate-[fadeSlideIn_0.4s_ease-out_0.35s_both]">COMPARATIF PRIX PAR ENSEIGNE</p>
            <div className="space-y-2 animate-[fadeSlideIn_0.4s_ease-out_0.4s_both]">
              {Object.entries(recipe.prices).sort((a,b) => a[1]-b[1]).map(([store, price]) => (
                <div key={store} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-slate-500 capitalize">{SUPERMARKETS.find(s => s.id === store)?.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all duration-700 ease-out" style={{ width: `${(price / Math.max(...Object.values(recipe.prices))) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs font-semibold text-slate-700">{fmtEuro(price)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShoppingList({ recipes, cheapestStoreFor, people = 1 }) {
  const grouped = useMemo(() => {
    const map = {};
    const seen = new Set();
    recipes.forEach(r => {
      const store = cheapestStoreFor(r);
      const perIngredient = r.ingredients.length ? (r.prices[store] * people) / r.ingredients.length : 0;
      r.ingredients.forEach(ing => {
        const key = ing.n;
        if (seen.has(key)) return;
        seen.add(key);
        (map[ing.a] = map[ing.a] || []).push({ name: ing.n, store, estPrice: perIngredient });
      });
    });
    return map;
  }, [recipes, people]);
  const [checked, setChecked] = useState({});
  const toggle = (name) => setChecked(c => ({ ...c, [name]: !c[name] }));
  const [copied, setCopied] = useState(false);
  const allItems = Object.values(grouped).flat();
  const totalCost = recipes.reduce((sum, r) => sum + r.prices[cheapestStoreFor(r)] * people, 0);

  const handleCopy = () => {
    const text = AISLE_ORDER.filter(a => grouped[a]).map(a => `${a}:\n` + grouped[a].map(i => `- ${i.name} (${SUPERMARKETS.find(s=>s.id===i.store)?.name}, ≈${fmtEuro(i.estPrice)})`).join('\n')).join('\n\n');
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-emerald-600" /> Liste de courses</h3>
        <span className="text-xs text-slate-400">{allItems.filter(i => checked[i.name]).length}/{allItems.length} pris</span>
      </div>
      <p className="text-sm text-slate-500 mb-1">Triée par rayon, avec l'enseigne la moins chère pour chaque produit.</p>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 my-4">
        <span className="text-xs text-slate-500">Total réel du panier (toutes recettes)</span>
        <span className="text-base font-bold text-slate-900">{fmtEuro(totalCost)}</span>
      </div>
      <div className="space-y-6 mb-6">
        {AISLE_ORDER.filter(a => grouped[a]).map(aisle => (
          <div key={aisle}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2.5">{aisle}</p>
            <ul className="space-y-2">
              {grouped[aisle].map(item => (
                <li key={item.name} onClick={() => toggle(item.name)} className="flex items-center justify-between gap-3 cursor-pointer group">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border transition-all ${checked[item.name] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'}`}>
                      {checked[item.name] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className={`text-sm transition-all ${checked[item.name] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.name}</span>
                  </span>
                  <span className="flex-none flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500">≈{fmtEuro(item.estPrice)}</span>
                    <span className="text-[11px] font-medium text-slate-400 capitalize">{SUPERMARKETS.find(s => s.id === item.store)?.name}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 -mt-4 mb-4">≈ estimation par article (prix de la recette répartie sur ses ingrédients), pas un prix exact en magasin.</p>
      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-100">
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"><Download className="h-3.5 w-3.5" /> Exporter en PDF</button>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"><Package className="h-3.5 w-3.5" /> Envoyer par WhatsApp</button>
        <button onClick={handleCopy} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Copy className="h-3.5 w-3.5" /> {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>
    </div>
  );
}

function Dashboard({ data, plan, setPlan, onRestart }) {
  const [openRecipe, setOpenRecipe] = useState(null);
  const [viewByDay, setViewByDay] = useState(false);
  const cheapestStoreFor = useCallback((recipe) => {
    const candidates = data.stores.length ? data.stores : SUPERMARKETS.map(s => s.id);
    return candidates.reduce((best, s) => recipe.prices[s] < recipe.prices[best] ? s : best, candidates[0]);
  }, [data.stores]);

  const people = data.adults + data.children * 0.6;
  const actualCost = plan.reduce((sum, r) => sum + r.prices[cheapestStoreFor(r)] * people, 0);
  const classicCost = plan.reduce((sum, r) => sum + Math.max(...Object.values(r.prices)) * people, 0);

  const replaceRecipe = (idx) => {
    const usedIds = new Set(plan.map(r => r.id));
    const pool = RECIPES.filter(r =>
      r.equipment.every(e => data.equipment.includes(e)) &&
      data.diets.every(d => r.diets.includes(d)) &&
      !usedIds.has(r.id)
    );
    if (!pool.length) return;
    const replacement = pool[Math.floor(Math.random() * pool.length)];
    setPlan(p => p.map((r, i) => i === idx ? replacement : r));
  };

  const mealTypeLabel = { petitdej: 'Petit-déjeuner', dejeuner: 'Déjeuner', diner: 'Dîner' };
  const mealTypeIcon = { petitdej: Coffee, dejeuner: Sandwich, diner: Moon };
  const byType = groupByMealType(plan, data.mealTypes, data.days);
  const byDay = groupByDay(plan, data.mealTypes, data.days);

  return (
    <div className="animate-[stepIn_0.4s_ease-out]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1.5">Ton menu de la semaine</p>
          <h2 className="text-2xl font-bold text-slate-900">{plan.length} repas prêts, {data.adults + data.children} convive{data.adults + data.children > 1 ? 's' : ''}</h2>
        </div>
        <button onClick={onRestart} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <RotateCcw className="h-3.5 w-3.5" /> Recommencer
        </button>
      </div>

      <div className="mb-8"><SavingsGauge budget={data.budget} actual={actualCost} classic={classicCost} /></div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-500 flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Planning de la semaine</h3>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <span className="text-xs font-medium text-slate-500">Organiser par jour</span>
              <span className="relative inline-flex h-5 w-9 items-center">
                <input type="checkbox" checked={viewByDay} onChange={e => setViewByDay(e.target.checked)} className="peer sr-only" />
                <span className="absolute inset-0 rounded-full bg-slate-200 peer-checked:bg-emerald-500 transition-colors" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </span>
            </label>
          </div>

          {!viewByDay ? (
            <div className="space-y-7">
              {byType.map(group => (
                <div key={group.mealType}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3 flex items-center gap-1.5">
                    {React.createElement(mealTypeIcon[group.mealType] || UtensilsCrossed, { className: 'h-3.5 w-3.5' })}
                    {mealTypeLabel[group.mealType] || group.mealType}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {group.items.map(({ index, recipe }) => (
                      <RecipeCard key={recipe.id + index} recipe={recipe} cheapestStore={cheapestStoreFor(recipe)} onOpen={() => setOpenRecipe(recipe)} onReplace={() => replaceRecipe(index)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {byDay.map(day => (
                <div key={day.day} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-3">Jour {day.day}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {day.slots.map(slot => (
                      <div key={slot.mealType} className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
                          {React.createElement(mealTypeIcon[slot.mealType] || UtensilsCrossed, { className: 'h-3 w-3' })}
                          {mealTypeLabel[slot.mealType] || slot.mealType}
                        </p>
                        <RecipeCard recipe={slot.recipe} cheapestStore={cheapestStoreFor(slot.recipe)} onOpen={() => setOpenRecipe(slot.recipe)} onReplace={() => replaceRecipe(slot.index)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div><ShoppingList recipes={plan} cheapestStoreFor={cheapestStoreFor} people={people} /></div>
      </div>

      <RecipeModal recipe={openRecipe} cheapestStore={openRecipe ? cheapestStoreFor(openRecipe) : null} onClose={() => setOpenRecipe(null)} />
    </div>
  );
}

/* =========================================================================
   APPLICATION PRINCIPALE
   ========================================================================= */
/* =========================================================================
   ECRAN D'ACCUEIL
   ========================================================================= */
function HeroScreen({ onStart }) {
  const floatEmojis = ['🍛','🍗','🌮','🥗','🍜','🐟'];
  return (
    <div className="animate-[stepIn_0.4s_ease-out] text-center pt-4 sm:pt-10">
      <div className="relative h-28 mb-2 hidden sm:block">
        {floatEmojis.map((e, i) => (
          <span
            key={i}
            className="absolute text-3xl opacity-70 animate-[floatY_4.5s_ease-in-out_infinite]"
            style={{ left: `${8 + i * 17}%`, animationDelay: `${i * 0.35}s`, top: i % 2 === 0 ? '10%' : '40%' }}
          >{e}</span>
        ))}
      </div>
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1.5 mb-6">
        <Wallet className="h-3.5 w-3.5 text-emerald-600" />
        <span className="text-xs font-semibold text-emerald-700">Optimisation budget en temps réel</span>
      </div>
      <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 mb-4 leading-[1.1] tracking-tight">
        Mange bien.<br /><span className="text-emerald-600">Dépense juste.</span>
      </h1>
      <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto mb-9">
        Ton menu de la semaine, calculé au centime près selon tes supermarchés, ton matériel et tes goûts. Zéro gaspillage, budget maîtrisé.
      </p>
      <button
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-[0.97]"
      >
        Créer mon menu <ArrowRight className="h-4 w-4" />
      </button>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-14 max-w-2xl mx-auto text-left">
        {[
          { icon: MapPin, title: 'Prix comparés localement', desc: 'Selon les enseignes que tu fréquentes vraiment.' },
          { icon: CookingPot, title: "Selon ton équipement", desc: "Seulement des recettes que tu peux vraiment cuisiner." },
          { icon: TrendingDown, title: 'Économies visibles', desc: 'Chaque euro économisé, affiché clairement.' },
        ].map((f, i) => (
          <div key={i} className="rounded-2xl border border-slate-200/70 bg-white p-5">
            <f.icon className="h-5 w-5 text-emerald-600 mb-3" strokeWidth={1.75} />
            <p className="text-sm font-semibold text-slate-800 mb-1">{f.title}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const DEFAULT_DATA = { location: '', stores: ['lidl','carrefour'], budget: 70, adults: 2, children: 1, days: 4, mealTypes: ['dejeuner','diner'], equipment: ['plaques','four'], diets: [], prefs: [], goals: [], dislikes: [], antiWaste: true };

export default function App() {
  const [screen, setScreen] = useState('hero'); // hero | wizard | loading | dashboard
  const [step, setStep] = useState(0);
  const [data, setData] = useState(DEFAULT_DATA);
  const [plan, setPlan] = useState([]);

  const generatePlan = () => {
    setScreen('loading');
    setTimeout(() => {
      setPlan(buildPlan(data));
      setScreen('dashboard');
    }, 1600);
  };

  const restart = () => { setScreen('hero'); setStep(0); setData(DEFAULT_DATA); setPlan([]); };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900" style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @keyframes stepIn { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        @keyframes popIn { from { transform: scale(0); } to { transform: scale(1); } }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes modalRise { from { opacity:0; transform: translateY(40px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes fadeSlideIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500">
              <ChefHat className="h-4 w-4 text-white" strokeWidth={2} />
            </div>
            <span className="font-bold text-slate-900">BudgetChef <span className="text-emerald-600">Pro</span></span>
          </div>
          {screen === 'wizard' && <span className="text-xs font-medium text-slate-400">Étape {step + 1} / 4</span>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 sm:px-8 py-10 sm:py-14 pb-24">
        {screen === 'hero' && <div className="max-w-2xl mx-auto"><HeroScreen onStart={() => setScreen('wizard')} /></div>}
        {screen === 'wizard' && (
          <div className="max-w-xl mx-auto">
            <ProgressBar step={step} total={4} />
            {step === 0 && <Step1 data={data} setData={setData} onNext={() => setStep(1)} />}
            {step === 1 && <Step2 data={data} setData={setData} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
            {step === 2 && <Step3 data={data} setData={setData} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step4 data={data} setData={setData} onGenerate={generatePlan} onBack={() => setStep(2)} />}
          </div>
        )}
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'dashboard' && <Dashboard data={data} plan={plan} setPlan={setPlan} onRestart={restart} />}
      </main>

      {/* Barre de navigation mobile (esthetique, mobile-first) */}
      {screen === 'dashboard' && (
        <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur-md py-2.5 sm:hidden">
          <div className="flex flex-col items-center gap-0.5 text-emerald-600"><UtensilsCrossed className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></div>
          <div className="flex flex-col items-center gap-0.5 text-slate-400"><ShoppingCart className="h-5 w-5" /><span className="text-[10px] font-medium">Courses</span></div>
          <div className="flex flex-col items-center gap-0.5 text-slate-400"><Wallet className="h-5 w-5" /><span className="text-[10px] font-medium">Budget</span></div>
        </nav>
      )}
    </div>
  );
}
