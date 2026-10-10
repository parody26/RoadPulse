import logging

logger = logging.getLogger(__name__)

def solve_knapsack_ortools(values, weights, capacity):
    try:
        from ortools.algorithms.python import knapsack_solver
        solver = knapsack_solver.KnapsackSolver(
            knapsack_solver.SolverType.KNAPSACK_MULTIDIMENSIONAL_BRANCH_AND_BOUND_SOLVER,
            'RoadPulseOptimizer'
        )
        solver.init(values, [weights], [capacity])
        solver.solve()
        selected = [i for i in range(len(values)) if solver.best_solution_contains(i)]
        return selected, solver.best_value()
    except Exception as e:
        logger.warning(f"OR-Tools knapsack solver fallback due to: {e}")
        return solve_knapsack_dp(values, weights, capacity)

def solve_knapsack_dp(values, weights, capacity):
    """
    Exact 0-1 Knapsack solver via Dynamic Programming fallback.
    """
    n = len(values)
    W = int(capacity)
    # Scale costs to integer units (e.g. step of 100 or 1000)
    scale = 100
    w_scaled = [max(1, int(w / scale)) for w in weights]
    W_scaled = int(W / scale)

    dp = [[0] * (W_scaled + 1) for _ in range(n + 1)]

    for i in range(1, n + 1):
        for w in range(1, W_scaled + 1):
            if w_scaled[i-1] <= w:
                dp[i][w] = max(dp[i-1][w], dp[i-1][w - w_scaled[i-1]] + int(values[i-1]))
            else:
                dp[i][w] = dp[i-1][w]

    # Backtrack selected items
    selected = []
    w = W_scaled
    for i in range(n, 0, -1):
        if dp[i][w] != dp[i-1][w]:
            selected.append(i - 1)
            w -= w_scaled[i-1]

    selected.reverse()
    total_benefit = sum(values[i] for i in selected)
    return selected, total_benefit

def optimize_budget(incidents: list, budget: float):
    """
    Solves the budget optimization problem for a list of Incident dictionaries or ORM objects.
    Each incident has 'estimated_cost' and 'risk_score' (benefit).
    """
    if not incidents:
        return {"budget": budget, "total_cost": 0, "total_benefit": 0, "selected": [], "excluded": []}

    values = [max(1, int(inc.risk_score * 10)) for inc in incidents] # Benefit scale
    weights = [int(inc.estimated_cost) for inc in incidents]
    capacity = int(budget)

    selected_indices, _ = solve_knapsack_ortools(values, weights, capacity)
    selected_set = set(selected_indices)

    selected_incidents = [incidents[i] for i in range(len(incidents)) if i in selected_set]
    excluded_incidents = [incidents[i] for i in range(len(incidents)) if i not in selected_set]

    total_cost = sum(inc.estimated_cost for inc in selected_incidents)
    total_benefit = round(sum(inc.risk_score for inc in selected_incidents), 1)

    return {
        "budget": budget,
        "total_cost": total_cost,
        "total_benefit": total_benefit,
        "selected": selected_incidents,
        "excluded": excluded_incidents
    }
