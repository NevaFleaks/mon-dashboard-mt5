const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Clé API de sécurité (à changer!)
const API_KEY = process.env.API_KEY || 'VOTRE_CLE_SECRETE_ICI';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Stockage en mémoire (pour démo - utilisez une DB en prod)
let tradingData = {
  account: null,
  trades: [],
  positions: [],
  lastUpdate: null
};

// Middleware de vérification de la clé API
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Clé API invalide' });
  }
  
  next();
};

// Route pour recevoir les données de MT5
app.post('/api/trades', verifyApiKey, (req, res) => {
  try {
    const { account, trades, positions, timestamp } = req.body;
    
    // Mise à jour des données
    tradingData = {
      account,
      trades,
      positions,
      lastUpdate: new Date().toISOString()
    };
    
    console.log(`✓ Données reçues: ${trades.length} trades, ${positions.length} positions`);
    
    res.json({ 
      success: true, 
      message: 'Données reçues',
      tradesCount: trades.length,
      positionsCount: positions.length
    });
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour obtenir les données (pour le frontend)
app.get('/api/data', (req, res) => {
  res.json(tradingData);
});

// Route pour les statistiques calculées
app.get('/api/stats', (req, res) => {
  const stats = calculateStats(tradingData.trades);
  res.json({
    account: tradingData.account,
    stats,
    lastUpdate: tradingData.lastUpdate
  });
});

// Page HTML principale
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fonction de calcul des statistiques
function calculateStats(trades) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      largestWin: 0,
      largestLoss: 0
    };
  }

  const winningTrades = trades.filter(t => t.profit > 0);
  const losingTrades = trades.filter(t => t.profit < 0);
  
  const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
  const netProfit = trades.reduce((sum, t) => sum + t.profit, 0);
  
  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate: trades.length > 0 ? (winningTrades.length / trades.length * 100).toFixed(2) : 0,
    totalProfit: totalProfit.toFixed(2),
    totalLoss: totalLoss.toFixed(2),
    netProfit: netProfit.toFixed(2),
    averageWin: winningTrades.length > 0 ? (totalProfit / winningTrades.length).toFixed(2) : 0,
    averageLoss: losingTrades.length > 0 ? (totalLoss / losingTrades.length).toFixed(2) : 0,
    profitFactor: totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : 0,
    largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profit)).toFixed(2) : 0,
    largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profit)).toFixed(2) : 0
  };
}

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📊 Dashboard accessible sur http://localhost:${PORT}`);
  console.log(`🔑 Clé API: ${API_KEY}`);
});
