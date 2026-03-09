module.exports = async () => {
  // Initialize Redis for testing
  const { initializeRedis } = await import('./src/config/redis');
  
  try {
    await initializeRedis();
  } catch (error) {
    console.warn('Redis initialization failed in tests, continuing with mock:', error.message);
  }
};
