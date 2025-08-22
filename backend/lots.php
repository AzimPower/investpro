<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
// backend/lots.php
header('Content-Type: application/json');
// Ajout des headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');

// Répondre à la requête OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
require_once 'db.php';

$pdo = Database::getInstance(); // Récupérer la connexion optimisée
// Fonction simple pour créer une notification
function createNotificationLocal($pdo, $userId, $title, $message, $type, $category = 'general', $relatedId = null) {
    try {
        // Vérifier si la table notifications existe
        $checkTableStmt = $pdo->query("SHOW TABLES LIKE 'notifications'");
        if ($checkTableStmt->rowCount() == 0) {
            error_log("Table notifications n'existe pas");
            return false;
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO notifications (userId, title, message, type, category, relatedId, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $result = $stmt->execute([$userId, $title, $message, $type, $category, $relatedId]);
        error_log("Notification créée: " . ($result ? "success" : "failed"));
        return $result;
    } catch (Exception $e) {
        error_log("Erreur création notification: " . $e->getMessage());
        return false;
    }
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $stmt = $pdo->query('SELECT * FROM lots');
        $lots = $stmt->fetchAll();
        echo json_encode($lots);
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Vérifier s'il s'agit d'un achat de lot
        if (isset($data['action']) && $data['action'] === 'purchase') {
            try {
                error_log("Début de l'achat de lot - UserId: " . $data['userId'] . ", LotId: " . $data['lotId']);
                
                $pdo->beginTransaction();
                
                $userId = $data['userId'];
                $lotId = $data['lotId'];
                
                // Récupérer les informations de l'utilisateur
                $userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $userStmt->execute([$userId]);
                $user = $userStmt->fetch();
                
                if (!$user) {
                    throw new Exception('Utilisateur non trouvé');
                }
                
                // Récupérer les informations du lot
                $lotStmt = $pdo->prepare('SELECT * FROM lots WHERE id = ?');
                $lotStmt->execute([$lotId]);
                $lot = $lotStmt->fetch();
                
                if (!$lot) {
                    throw new Exception('Lot non trouvé');
                }
                
                // Vérifier si l'utilisateur a assez d'argent
                if ($user['balance'] < $lot['price']) {
                    throw new Exception('Solde insuffisant');
                }
                
                // Désactiver tous les lots précédents de l'utilisateur
                $deactivateStmt = $pdo->prepare('UPDATE user_lots SET active = 0 WHERE userId = ?');
                $deactivateStmt->execute([$userId]);
                
                // Ajouter le nouveau lot à user_lots - lastEarningDate = NULL pour permettre une réclamation immédiate
                $insertLotStmt = $pdo->prepare('INSERT INTO user_lots (userId, lotId, purchasedAt, active, lastEarningDate) VALUES (?, ?, NOW(), 1, NULL)');
                $insertLotStmt->execute([$userId, $lotId]);
                
                // Déduire le montant du solde de l'utilisateur
                $newBalance = $user['balance'] - $lot['price'];
                $updateBalanceStmt = $pdo->prepare('UPDATE users SET balance = ? WHERE id = ?');
                $updateBalanceStmt->execute([$newBalance, $userId]);
                
                // Enregistrer la transaction d'achat
                $transactionStmt = $pdo->prepare('INSERT INTO transactions (userId, type, amount, status, description, lotId, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                $transactionStmt->execute([
                    $userId,
                    'purchase',
                    $lot['price'],
                    'approved',
                    'Achat du lot ' . $lot['name'],
                    $lotId
                ]);

                // --- GESTION DES COMMISSIONS DE PARRAINAGE ---
                // Récupérer les informations de l'utilisateur avec son parrain
                $userStmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $userStmt->execute([$userId]);
                $purchaser = $userStmt->fetch();

                if ($purchaser && $purchaser['referredBy']) {
                    error_log("Traitement des commissions pour l'utilisateur: " . $purchaser['fullName']);
                    
                    // Commission niveau 1 : 10% sur le prix du lot
                    $sponsor1Stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                    $sponsor1Stmt->execute([$purchaser['referredBy']]);
                    $sponsor1 = $sponsor1Stmt->fetch();

                    if ($sponsor1) {
                        $commission1 = $lot['price'] * 0.10;
                        $sponsor1NewBalance = $sponsor1['balance'] + $commission1;
                        $sponsor1NewTotalEarned = ($sponsor1['totalEarned'] ?? 0) + $commission1;

                        // Mettre à jour le solde du parrain niveau 1
                        $updateSponsor1Stmt = $pdo->prepare('UPDATE users SET balance = ?, totalEarned = ? WHERE id = ?');
                        $updateSponsor1Stmt->execute([$sponsor1NewBalance, $sponsor1NewTotalEarned, $sponsor1['id']]);

                        // Enregistrer la transaction de commission niveau 1
                        $commission1TxStmt = $pdo->prepare('INSERT INTO transactions (userId, type, amount, status, description, lotId, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                        $commission1TxStmt->execute([
                            $sponsor1['id'],
                            'commission',
                            $commission1,
                            'approved',
                            'Commission de parrainage (10%) sur achat de lot ' . $lot['name'] . ' par ' . $purchaser['fullName'],
                            $lotId
                        ]);

                        // Commission niveau 2 : 5% sur le prix du lot (si le parrain a lui-même un parrain)
                        if ($sponsor1['referredBy']) {
                            $sponsor2Stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                            $sponsor2Stmt->execute([$sponsor1['referredBy']]);
                            $sponsor2 = $sponsor2Stmt->fetch();

                            if ($sponsor2) {
                                $commission2 = $lot['price'] * 0.05;
                                $sponsor2NewBalance = $sponsor2['balance'] + $commission2;
                                $sponsor2NewTotalEarned = ($sponsor2['totalEarned'] ?? 0) + $commission2;

                                // Mettre à jour le solde du parrain niveau 2
                                $updateSponsor2Stmt = $pdo->prepare('UPDATE users SET balance = ?, totalEarned = ? WHERE id = ?');
                                $updateSponsor2Stmt->execute([$sponsor2NewBalance, $sponsor2NewTotalEarned, $sponsor2['id']]);

                                // Enregistrer la transaction de commission niveau 2
                                $commission2TxStmt = $pdo->prepare('INSERT INTO transactions (userId, type, amount, status, description, lotId, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())');
                                $commission2TxStmt->execute([
                                    $sponsor2['id'],
                                    'commission',
                                    $commission2,
                                    'approved',
                                    'Commission de parrainage (5%) sur achat de lot ' . $lot['name'] . ' par ' . $purchaser['fullName'],
                                    $lotId
                                ]);
                            }
                        }
                    }
                } else {
                    error_log("Aucun parrain trouvé pour l'utilisateur");
                }
                
                $pdo->commit();
                error_log("Transaction committée avec succès");
                
                // Créer les notifications APRÈS le commit pour éviter les problèmes de rollback
                // Notification pour l'achat du lot
                createNotificationLocal(
                    $pdo,
                    $userId,
                    'Lot activé avec succès',
                    'Vous avez activé le lot ' . $lot['name'] . ' pour ' . number_format($lot['price'], 0, ',', ' ') . ' FCFA',
                    'success',
                    'purchase',
                    $lotId
                );
                
                // Notifications de commission si applicable
                if ($purchaser && $purchaser['referredBy'] && isset($sponsor1) && $sponsor1) {
                    createNotificationLocal(
                        $pdo,
                        $sponsor1['id'],
                        'Commission de parrainage reçue',
                        'Vous avez reçu ' . number_format($commission1, 0, ',', ' ') . ' FCFA de commission (10%) pour l\'achat du lot ' . $lot['name'] . ' par ' . $purchaser['fullName'],
                        'success',
                        'commission',
                        $lotId
                    );
                    
                    if (isset($sponsor2) && $sponsor2) {
                        createNotificationLocal(
                            $pdo,
                            $sponsor2['id'],
                            'Commission de parrainage reçue',
                            'Vous avez reçu ' . number_format($commission2, 0, ',', ' ') . ' FCFA de commission (5%) pour l\'achat du lot ' . $lot['name'] . ' par ' . $purchaser['fullName'],
                            'success',
                            'commission',
                            $lotId
                        );
                    }
                }
                
                echo json_encode(['success' => true, 'message' => 'Lot acheté avec succès']);
                
            } catch (Exception $e) {
                $pdo->rollBack();
                error_log("Erreur lors de l'achat: " . $e->getMessage());
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } else {
            // Création d'un nouveau lot (avec duration)
            $stmt = $pdo->prepare('INSERT INTO lots (name, price, dailyReturn, duration, color, active) VALUES (?, ?, ?, ?, ?, ?)');
            $stmt->execute([
                $data['name'],
                $data['price'],
                $data['dailyReturn'],
                $data['duration'],
                $data['color'],
                $data['active'] ?? true
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        error_log('LOTS PUT DATA: ' . print_r($data, true));
        $sql = 'UPDATE lots SET name = ?, price = ?, dailyReturn = ?, duration = ?, color = ?, active = ? WHERE id = ?';
        error_log('LOTS PUT SQL: ' . $sql);
        error_log('LOTS PUT PARAMS: ' . print_r([
            $data['name'],
            $data['price'],
            $data['dailyReturn'],
            $data['duration'],
            $data['color'],
            $data['active'],
            $data['id']
        ], true));
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['name'],
            $data['price'],
            $data['dailyReturn'],
            $data['duration'],
            $data['color'],
            $data['active'],
            $data['id']
        ]);
        error_log('LOTS PUT EXECUTED WITH duration=' . $data['duration']);
        echo json_encode(['success' => true]);
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM lots WHERE id = ?');
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['error' => 'Missing id']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Méthode non autorisée']);
}
?>
