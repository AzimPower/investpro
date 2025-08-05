<?php
// backend/agent_applications.php
require_once 'db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'POST':
        // Insertion d'une nouvelle demande agent
        $data = json_decode(file_get_contents('php://input'), true);
        if (!isset($data['userId'], $data['fullName'], $data['phone'], $data['operator'], $data['agentNumber'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Champs manquants']);
            exit;
        }
        $stmt = $pdo->prepare('INSERT INTO agent_applications (userId, fullName, phone, operator, agentNumber) VALUES (?, ?, ?, ?, ?)');
        $success = $stmt->execute([
            $data['userId'],
            $data['fullName'],
            $data['phone'],
            $data['operator'],
            $data['agentNumber']
        ]);
        if ($success) {
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Erreur lors de l\'insertion']);
        }
        break;
    case 'GET':
        // Affichage des demandes agent (toutes ou par userId)
        $userId = isset($_GET['userId']) ? intval($_GET['userId']) : null;
        if ($userId) {
            $stmt = $pdo->prepare('SELECT * FROM agent_applications WHERE userId = ? ORDER BY createdAt DESC');
            $stmt->execute([$userId]);
        } else {
            $stmt = $pdo->query('SELECT * FROM agent_applications ORDER BY createdAt DESC');
        }
        $applications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($applications);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
