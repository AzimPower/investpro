<?php
// backend/agent_stats.php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Méthode non autorisée']);
    exit;
}

$startDate = $_GET['startDate'] ?? null;
$endDate = $_GET['endDate'] ?? null;

if (!$startDate || !$endDate) {
    http_response_code(400);
    echo json_encode(['error' => 'startDate et endDate requis']);
    exit;
}

try {
    // Récupérer tous les agents
    $stmt = $pdo->prepare("SELECT id, fullName, phone, agentNumber FROM users WHERE role = 'agent'");
    $stmt->execute();
    $agents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    foreach ($agents as $agent) {
        $agentId = $agent['id'];
    // DEBUG: Afficher les transactions trouvées pour chaque type
    // Dépôts (userId ou agentId)
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE (agentId = ? OR userId = ?) AND type = 'deposit' AND (status = 'approved' OR status = 'completed') AND processedAt BETWEEN ? AND ?");
    $stmt->execute([$agentId, $agentId, $startDate, $endDate]);
    $depotRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log('AGENT '.$agentId.' DEPOTS: '.json_encode($depotRows));
    $deposit = array_sum(array_column($depotRows, 'amount'));
    // Retraits (userId ou agentId)
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE (agentId = ? OR userId = ?) AND type = 'withdrawal' AND (status = 'approved' OR status = 'completed') AND processedAt BETWEEN ? AND ?");
    $stmt->execute([$agentId, $agentId, $startDate, $endDate]);
    $retraitRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log('AGENT '.$agentId.' RETRAITS: '.json_encode($retraitRows));
    $withdrawal = array_sum(array_column($retraitRows, 'amount'));
    // Commissions (userId ou agentId)
    $stmt = $pdo->prepare("SELECT * FROM transactions WHERE (agentId = ? OR userId = ?) AND type = 'commission' AND (status = 'approved' OR status = 'completed') AND processedAt BETWEEN ? AND ?");
    $stmt->execute([$agentId, $agentId, $startDate, $endDate]);
    $commissionRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    error_log('AGENT '.$agentId.' COMMISSIONS: '.json_encode($commissionRows));
    $commission = array_sum(array_column($commissionRows, 'amount'));
        $results[] = [
            'agent' => $agent,
            'deposit' => floatval($deposit),
            'withdrawal' => floatval($withdrawal),
            'commission' => floatval($commission)
        ];
    }
    echo json_encode(['success' => true, 'stats' => $results]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
