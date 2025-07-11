// routes/analytics.js - COMPLETE FINAL VERSION
const express = require('express');
const auth = require('../middleware/auth');
const XLSX = require('xlsx');

const router = express.Router();

// Import your models
const DailySnapshot = require('../models/DailySnapshot');

// Simple test route to verify analytics routes work
router.get('/test', auth, async (req, res) => {
  res.json({ 
    message: 'Analytics routes working!', 
    userId: req.user.id,
    timestamp: new Date().toISOString()
  });
});

// Get portfolio history
router.get('/portfolio/history', auth, async (req, res) => {
  try {
    const { days = 7, wallet } = req.query;
    const userId = req.user.id;
    
    console.log(`Getting portfolio history for user: ${userId}, days: ${days}`);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const query = { userId, date: { $gte: startDate } };
    if (wallet) query.walletAddress = wallet;
    
    const snapshots = await DailySnapshot.find(query).sort({ date: 1 });
    
    console.log(`Found ${snapshots.length} snapshots`);
    
    res.json({
      snapshots: snapshots.map(s => ({
        date: s.date,
        walletAddress: s.walletAddress,
        totalNavUsd: s.totalNavUsd,
        tokensNavUsd: s.tokensNavUsd,
        positionsNavUsd: s.positionsNavUsd,
        dailyReturn: s.dailyReturn,
        dailyApy: s.dailyApy,
        monthlyApy: s.monthlyApy,
        volatility: s.volatility,
        maxDrawdown: s.maxDrawdown,
        benchmarkRate: s.benchmarkRate
      })),
      summary: {
        totalSnapshots: snapshots.length,
        dateRange: {
          start: snapshots.length > 0 ? snapshots[0].date : null,
          end: snapshots.length > 0 ? snapshots[snapshots.length - 1].date : null
        }
      }
    });
  } catch (error) {
    console.error('Error in portfolio/history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get portfolio performance metrics
router.get('/portfolio/performance', auth, async (req, res) => {
  try {
    const { period = 30, wallet } = req.query;
    const userId = req.user.id;
    
    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const query = { userId, date: { $gte: startDate } };
    if (wallet) query.walletAddress = wallet;
    
    const snapshots = await DailySnapshot.find(query).sort({ date: 1 });
    
    if (snapshots.length < 2) {
      return res.json({ 
        error: 'Insufficient data for performance calculation',
        availableSnapshots: snapshots.length 
      });
    }
    
    const firstSnapshot = snapshots[0];
    const lastSnapshot = snapshots[snapshots.length - 1];
    const totalReturn = (lastSnapshot.totalNavUsd / firstSnapshot.totalNavUsd) - 1;
    const daysPeriod = (lastSnapshot.date - firstSnapshot.date) / (1000 * 60 * 60 * 24);
    const annualizedReturn = Math.pow(1 + totalReturn, 365 / daysPeriod) - 1;
    
    const avgBenchmarkRate = snapshots.reduce((sum, s) => sum + (s.benchmarkRate || 0), 0) / snapshots.length;
    const latestMetrics = lastSnapshot;
    
    res.json({
      period: {
        days: daysPeriod,
        startDate: firstSnapshot.date,
        endDate: lastSnapshot.date
      },
      performance: {
        totalReturn: totalReturn * 100,
        annualizedReturn: annualizedReturn * 100,
        currentNavUsd: lastSnapshot.totalNavUsd,
        startingNavUsd: firstSnapshot.totalNavUsd,
        dailyApy: latestMetrics.dailyApy,
        monthlyApy: latestMetrics.monthlyApy,
        volatility: latestMetrics.volatility,
        maxDrawdown: latestMetrics.maxDrawdown,
        sharpeRatio: latestMetrics.volatility ? (annualizedReturn * 100 - avgBenchmarkRate) / latestMetrics.volatility : null
      },
      benchmark: {
        avgRate: avgBenchmarkRate,
        currentRate: latestMetrics.benchmarkRate,
        excessReturn: (annualizedReturn * 100) - avgBenchmarkRate
      },
      dataPoints: snapshots.length
    });
  } catch (error) {
    console.error('Error in portfolio/performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get detailed portfolio snapshot for specific date
router.get('/portfolio/snapshot/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const { wallet } = req.query;
    const userId = req.user.id;
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const query = { 
      userId,
      date: targetDate
    };
    if (wallet) query.walletAddress = wallet;
    
    const snapshots = await DailySnapshot.find(query);
    
    if (!snapshots.length) {
      return res.status(404).json({ error: 'No data found for this date' });
    }
    
    res.json({
      date: targetDate,
      wallets: snapshots.map(snapshot => ({
        walletAddress: snapshot.walletAddress,
        totalNavUsd: snapshot.totalNavUsd,
        tokensNavUsd: snapshot.tokensNavUsd,
        positionsNavUsd: snapshot.positionsNavUsd,
        tokens: snapshot.tokens,
        positions: snapshot.positions,
        performanceMetrics: {
          dailyReturn: snapshot.dailyReturn,
          dailyApy: snapshot.dailyApy,
          monthlyApy: snapshot.monthlyApy,
          volatility: snapshot.volatility,
          maxDrawdown: snapshot.maxDrawdown
        },
        benchmarkRate: snapshot.benchmarkRate
      }))
    });
  } catch (error) {
    console.error('Error in portfolio/snapshot:', error);
    res.status(500).json({ error: error.message });
  }
});

// IMPROVED EXCEL FILE DOWNLOAD WITH BETTER FORMATTING
router.get('/export/excel', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wallet } = req.query;
    
    console.log(`🔄 Generating improved Excel file for user: ${userId}`);
    
    // Get latest snapshot
    const query = { userId };
    if (wallet) query.walletAddress = wallet;
    
    const latestSnapshot = await DailySnapshot.findOne(query).sort({ date: -1 });
    
    if (!latestSnapshot) {
      return res.status(404).json({ 
        error: 'No portfolio data found. Please run data collection first.' 
      });
    }
    
    // Get historical data
    const snapshots = await DailySnapshot.find(query)
      .sort({ date: 1 })
      .limit(100);
    
    console.log(`📊 Found ${snapshots.length} snapshots for export`);
    console.log(`📊 Latest snapshot has ${latestSnapshot.tokens?.length || 0} tokens and ${latestSnapshot.positions?.length || 0} positions`);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // === SHEET 1: TOKENS ===
    const tokensData = [];
    
    // Header section
    tokensData.push(['PORTFOLIO TOKENS BREAKDOWN']);
    tokensData.push(['Generated:', new Date().toLocaleDateString()]);
    tokensData.push(['Wallet:', latestSnapshot.walletAddress ? `${latestSnapshot.walletAddress.slice(0, 6)}...${latestSnapshot.walletAddress.slice(-4)}` : 'Unknown']);
    tokensData.push(['Total Tokens NAV:', `$${(latestSnapshot.tokensNavUsd || 0).toLocaleString()}`]);
    tokensData.push(['']); // Empty row for spacing
    
    // Column headers
    tokensData.push(['Chain', 'Token Symbol', 'Token Name', 'Amount', 'Price (USD)', 'Total Value (USD)', '% of Tokens']);
    
    // Calculate total for percentages
    const totalTokenValue = latestSnapshot.tokensNavUsd || 0;
    
    if (latestSnapshot.tokens && latestSnapshot.tokens.length > 0) {
      latestSnapshot.tokens.forEach(token => {
        const percentage = totalTokenValue > 0 ? ((token.usdValue || 0) / totalTokenValue * 100).toFixed(2) : 0;
        tokensData.push([
          token.chain ? token.chain.toUpperCase() : '', 
          token.symbol || '', 
          token.name || '',
          Number(token.amount) || 0, 
          Number(token.price) || 0, 
          Number(token.usdValue) || 0,
          `${percentage}%`
        ]);
      });
    } else {
      tokensData.push(['', 'No tokens found', '', '', '', '', '']);
    }
    
    // Add total row
    tokensData.push(['']); // Empty row
    tokensData.push(['', 'TOTAL TOKENS VALUE:', '', '', '', totalTokenValue, '100%']);
    
    const tokensSheet = XLSX.utils.aoa_to_sheet(tokensData);
    
    // Set column widths for tokens
    tokensSheet['!cols'] = [
      { width: 12 }, // Chain
      { width: 15 }, // Symbol
      { width: 20 }, // Name
      { width: 20 }, // Amount
      { width: 15 }, // Price
      { width: 18 }, // Value
      { width: 15 }  // Percentage
    ];
    
    XLSX.utils.book_append_sheet(workbook, tokensSheet, 'Tokens');
    
    // === SHEET 2: DEFI POSITIONS (DETAILED) ===
    const positionsData = [];
    
    // Header section
    positionsData.push(['DEFI POSITIONS BREAKDOWN']);
    positionsData.push(['Generated:', new Date().toLocaleDateString()]);
    positionsData.push(['Wallet:', latestSnapshot.walletAddress ? `${latestSnapshot.walletAddress.slice(0, 6)}...${latestSnapshot.walletAddress.slice(-4)}` : 'Unknown']);
    positionsData.push(['Total Positions NAV:', `$${(latestSnapshot.positionsNavUsd || 0).toLocaleString()}`]);
    positionsData.push(['']); // Empty row
    
    if (latestSnapshot.positions && latestSnapshot.positions.length > 0) {
      console.log(`📊 Processing ${latestSnapshot.positions.length} positions`);
      
      latestSnapshot.positions.forEach((position, index) => {
        // Protocol header (with styling indicator)
        positionsData.push([`🔸 PROTOCOL ${index + 1}: ${position.protocolName || 'Unknown Protocol'}`]);
        positionsData.push(['Chain:', position.chain ? position.chain.toUpperCase() : 'Unknown']);
        positionsData.push(['Total Position Value:', `$${(position.totalUsdValue || 0).toLocaleString()}`]);
        positionsData.push(['Daily APY:', `${(position.dailyApy || 0).toFixed(2)}%`]);
        positionsData.push(['Position Type:', position.positionType || 'LP']);
        positionsData.push(['']); // Empty row
        
        // Supply tokens section
        positionsData.push(['📍 SUPPLY TOKENS (Your deposits):']);
        positionsData.push(['Token Symbol', 'Amount', 'Price (USD)', 'USD Value', 'Description']);
        
        if (position.supplyTokens && position.supplyTokens.length > 0) {
          position.supplyTokens.forEach(token => {
            positionsData.push([
              token.symbol || 'Unknown', 
              Number(token.amount) || 0, 
              Number(token.price) || 0, 
              Number(token.usdValue) || 0,
              'Deposited/Supplied'
            ]);
          });
        } else {
          positionsData.push(['No supply tokens', '', '', '', '']);
        }
        
        positionsData.push(['']); // Empty row
        
        // Unclaimed rewards section
        positionsData.push(['🎁 UNCLAIMED REWARDS:']);
        positionsData.push(['Reward Token', 'Amount', 'Price (USD)', 'USD Value', 'Status']);
        
        if (position.rewardTokens && position.rewardTokens.length > 0) {
          position.rewardTokens.forEach(token => {
            positionsData.push([
              token.symbol || 'Unknown', 
              Number(token.amount) || 0, 
              Number(token.price) || 0, 
              Number(token.usdValue) || 0,
              'Claimable'
            ]);
          });
        } else {
          positionsData.push(['No unclaimed rewards', '', '', '', '']);
        }
        
        // Add separator between positions
        positionsData.push(['']); // Empty row
        positionsData.push(['═══════════════════════════════════════════════════════════']);
        positionsData.push(['']); // Empty row
      });
      
    } else {
      positionsData.push(['ℹ️  NO DEFI POSITIONS FOUND']);
      positionsData.push(['']);
      positionsData.push(['This wallet does not have any active DeFi positions.']);
      positionsData.push(['DeFi positions include:']);
      positionsData.push(['• Liquidity Pool (LP) tokens']);
      positionsData.push(['• Yield farming positions']);
      positionsData.push(['• Lending/borrowing positions']);
      positionsData.push(['• Staking rewards']);
    }
    
    const positionsSheet = XLSX.utils.aoa_to_sheet(positionsData);
    
    // Set column widths for positions
    positionsSheet['!cols'] = [
      { width: 25 }, // Token/Description
      { width: 20 }, // Amount
      { width: 15 }, // Price
      { width: 18 }, // USD Value
      { width: 20 }  // Status/Description
    ];
    
    XLSX.utils.book_append_sheet(workbook, positionsSheet, 'DeFi Positions');
    
    // === SHEET 3: PORTFOLIO SUMMARY ===
    const summaryData = [];
    
    // Header
    summaryData.push(['PORTFOLIO SUMMARY REPORT']);
    summaryData.push(['Generated:', new Date().toLocaleDateString()]);
    summaryData.push(['Wallet Address:', latestSnapshot.walletAddress || 'Unknown']);
    summaryData.push(['Report Period:', `${snapshots.length} days of data`]);
    summaryData.push(['']); // Empty row
    
    // Key metrics
    summaryData.push(['📊 KEY METRICS:']);
    summaryData.push(['Total Portfolio Value (NAV):', `$${(latestSnapshot.totalNavUsd || 0).toLocaleString()}`]);
    summaryData.push(['Tokens Value:', `$${(latestSnapshot.tokensNavUsd || 0).toLocaleString()}`]);
    summaryData.push(['DeFi Positions Value:', `$${(latestSnapshot.positionsNavUsd || 0).toLocaleString()}`]);
    summaryData.push(['Daily APY:', `${(latestSnapshot.dailyApy || 0).toFixed(2)}%`]);
    summaryData.push(['Monthly APY:', `${(latestSnapshot.monthlyApy || 0).toFixed(2)}%`]);
    summaryData.push(['Portfolio Volatility:', `${(latestSnapshot.volatility || 0).toFixed(2)}%`]);
    summaryData.push(['Max Drawdown:', `${(latestSnapshot.maxDrawdown || 0).toFixed(2)}%`]);
    summaryData.push(['Benchmark Rate (USDC):', `${(latestSnapshot.benchmarkRate || 3.5).toFixed(2)}%`]);
    summaryData.push(['']); // Empty row
    
    // Allocation breakdown
    const tokensPercent = latestSnapshot.totalNavUsd > 0 ? 
      ((latestSnapshot.tokensNavUsd || 0) / latestSnapshot.totalNavUsd * 100).toFixed(1) : 0;
    const positionsPercent = latestSnapshot.totalNavUsd > 0 ? 
      ((latestSnapshot.positionsNavUsd || 0) / latestSnapshot.totalNavUsd * 100).toFixed(1) : 0;
      
    summaryData.push(['📈 ALLOCATION BREAKDOWN:']);
    summaryData.push(['Asset Type', 'Value (USD)', 'Percentage']);
    summaryData.push(['Liquid Tokens', latestSnapshot.tokensNavUsd || 0, `${tokensPercent}%`]);
    summaryData.push(['DeFi Positions', latestSnapshot.positionsNavUsd || 0, `${positionsPercent}%`]);
    summaryData.push(['TOTAL', latestSnapshot.totalNavUsd || 0, '100%']);
    summaryData.push(['']); // Empty row
    
    // Historical data section
    summaryData.push(['📅 HISTORICAL DATA (Last 10 days):']);
    summaryData.push(['Date', 'Total NAV (USD)', 'Daily Return (%)', 'Daily APY (%)', 'Volatility (%)']);
    
    // Add last 10 snapshots
    const recentSnapshots = snapshots.slice(-10);
    recentSnapshots.forEach(snapshot => {
      summaryData.push([
        snapshot.date.toISOString().split('T')[0],
        Number(snapshot.totalNavUsd) || 0,
        Number(snapshot.dailyReturn) || 0,
        Number(snapshot.dailyApy) || 0,
        Number(snapshot.volatility) || 0
      ]);
    });
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary
    summarySheet['!cols'] = [
      { width: 25 }, // Metric/Date
      { width: 20 }, // Value
      { width: 15 }, // Percentage/Return
      { width: 15 }, // APY
      { width: 15 }  // Volatility
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Portfolio Summary');
    
    // === GENERATE EXCEL BUFFER ===
    console.log('📝 Writing improved Excel file...');
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });
    
    // === SET RESPONSE HEADERS ===
    const filename = `portfolio_detailed_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', excelBuffer.length);
    
    console.log(`✅ Improved Excel file ready: ${filename} (${excelBuffer.length} bytes)`);
    console.log(`📊 File contains: ${latestSnapshot.tokens?.length || 0} tokens, ${latestSnapshot.positions?.length || 0} positions`);
    
    // Send the Excel file
    res.send(excelBuffer);
    
  } catch (error) {
    console.error('❌ Error generating improved Excel:', error);
    res.status(500).json({ 
      error: 'Failed to generate Excel file', 
      details: error.message 
    });
  }
});

// JSON DATA ENDPOINT (for frontend processing)
router.get('/export/excel/data', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { wallet } = req.query;
    
    const query = { userId };
    if (wallet) query.walletAddress = wallet;
    
    const latestSnapshot = await DailySnapshot.findOne(query).sort({ date: -1 });
    
    if (!latestSnapshot) {
      return res.status(404).json({ 
        error: 'No portfolio data found.' 
      });
    }
    
    const snapshots = await DailySnapshot.find(query)
      .sort({ date: 1 })
      .limit(100);
    
    const tokensTable = [
      ['TOKENS', '', '', '', '', '', 'Tokens NAV', latestSnapshot.tokensNavUsd],
      ['', '', 'chain', 'ticker symbol', 'amount', 'price', 'usd value', '']
    ];
    
    if (latestSnapshot.tokens && latestSnapshot.tokens.length > 0) {
      latestSnapshot.tokens.forEach(token => {
        tokensTable.push([
          '', '', token.chain || '', token.symbol || '', 
          token.amount || 0, token.price || 0, token.usdValue || 0, ''
        ]);
      });
    }
    
    const positionsTable = [
      ['POSITIONS', '', '', '', '', '', 'Positions NAV', latestSnapshot.positionsNavUsd]
    ];
    
    if (latestSnapshot.positions && latestSnapshot.positions.length > 0) {
      latestSnapshot.positions.forEach(position => {
        const symbolList = (position.supplyTokens && position.supplyTokens.length > 0) 
          ? position.supplyTokens.map(t => t.symbol).join('-') 
          : 'No Supply Tokens';
        positionsTable.push([
          `${position.protocolName} - ${symbolList}`, position.chain || '', '', '', '', '', 'Position NAV', position.totalUsdValue || 0
        ]);
        
        positionsTable.push(['Position', '', 'ticker symbol', 'amount', 'price', 'usd value', '', '']);
        if (position.supplyTokens && position.supplyTokens.length > 0) {
          position.supplyTokens.forEach(token => {
            positionsTable.push([
              '', '', token.symbol || '', token.amount || 0, token.price || 0, token.usdValue || 0, '', ''
            ]);
          });
        }
        
        positionsTable.push(['Rewards', '', '', '', '', '', '', 0]);
        if (position.rewardTokens && position.rewardTokens.length > 0) {
          position.rewardTokens.forEach(token => {
            positionsTable.push([
              '', '', token.symbol || '', token.amount || 0, token.price || 0, token.usdValue || 0, '', ''
            ]);
          });
        }
      });
    }
    
    const summaryTable = [
      ['Date', 'Total NAV USD', 'Tokens NAV', 'Positions NAV', 'Daily Return %', 'Daily APY %', 'Monthly APY %', 'Volatility %', 'Max Drawdown %', 'Benchmark Rate %']
    ];
    
    snapshots.forEach(snapshot => {
      summaryTable.push([
        snapshot.date.toISOString().split('T')[0],
        snapshot.totalNavUsd || 0,
        snapshot.tokensNavUsd || 0,
        snapshot.positionsNavUsd || 0,
        snapshot.dailyReturn || 0,
        snapshot.dailyApy || 0,
        snapshot.monthlyApy || 0,
        snapshot.volatility || 0,
        snapshot.maxDrawdown || 0,
        snapshot.benchmarkRate || 3.5
      ]);
    });
    
    res.json({
      filename: `portfolio_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      data: { tokensTable, positionsTable, summaryTable },
      metadata: {
        exportDate: new Date(),
        totalSnapshots: snapshots.length,
        wallets: [...new Set(snapshots.map(s => s.walletAddress))],
        dateRange: snapshots.length > 0 ? {
          start: snapshots[0].date,
          end: snapshots[snapshots.length - 1].date
        } : null
      }
    });
    
  } catch (error) {
    console.error('Error in excel/data export:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get token history over time
router.get('/tokens/history', auth, async (req, res) => {
  try {
    const { wallet, symbol, days = 30 } = req.query;
    const userId = req.user.id;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    
    const query = { userId, date: { $gte: startDate } };
    if (wallet) query.walletAddress = wallet;
    
    const snapshots = await DailySnapshot.find(query).sort({ date: 1 });
    
    const tokenHistory = snapshots.map(snapshot => {
      const tokens = symbol 
        ? snapshot.tokens.filter(t => t.symbol.toLowerCase() === symbol.toLowerCase())
        : snapshot.tokens;
      
      return {
        date: snapshot.date,
        walletAddress: snapshot.walletAddress,
        tokens: tokens.map(token => ({
          symbol: token.symbol,
          amount: token.amount,
          price: token.price,
          usdValue: token.usdValue,
          chain: token.chain
        })),
        totalTokenValue: tokens.reduce((sum, t) => sum + (t.usdValue || 0), 0)
      };
    });
    
    res.json({
      tokenHistory,
      filters: { wallet, symbol, days },
      summary: {
        totalSnapshots: tokenHistory.length,
        uniqueTokens: symbol ? 1 : [...new Set(tokenHistory.flatMap(h => h.tokens.map(t => t.symbol)))].length
      }
    });
  } catch (error) {
    console.error('Error in tokens/history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export the router
module.exports = router;