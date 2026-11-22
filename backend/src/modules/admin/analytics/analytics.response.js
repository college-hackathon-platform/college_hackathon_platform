function successResponse(res, message, data, appliedFilters = null) {
  return res.status(200).json({
    success: true,
    message,
    data,
    ...(appliedFilters ? { filters: appliedFilters } : {}),
  });
}

function distributionItem(category, count, denominator) {
  const safeDenominator = Number(denominator) > 0 ? Number(denominator) : 0;
  return {
    category,
    count,
    percentage: safeDenominator ? Number(((count / safeDenominator) * 100).toFixed(2)) : 0,
  };
}

module.exports = { successResponse, distributionItem };
