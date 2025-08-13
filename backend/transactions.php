<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
// backend/transactions.php
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        try {
            $userId = $_GET['userId'] ?? null;
            if ($userId) {
                $stmt = $pdo->prepare('SELECT * FROM transactions WHERE userId = ? ORDER BY createdAt DESC');
                $stmt->execute([$userId]);
                $transactions = $stmt->fetchAll();
            } else {
                $stmt = $pdo->query('SELECT * FROM transactions ORDER BY createdAt DESC');
                $transactions = $stmt->fetchAll();
            }
            echo json_encode($transactions);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;
    case 'POST':
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data) {
                throw new Exception('Données invalides');
            }
            
            // Gestion spéciale pour la vérification d'utilisateur
            if (isset($data['action']) && $data['action'] === 'verify_user') {
                if (!isset($data['phone'])) {
                    throw new Exception('Numéro de téléphone requis');
                }
                
                $phone = trim($data['phone']);
                
                // Normaliser le numéro de téléphone
                $normalizedPhone = normalizePhoneNumber($phone);
                
                // Debug: Log des valeurs
                error_log("DEBUG verify_user - Phone original: $phone");
                error_log("DEBUG verify_user - Phone normalisé: $normalizedPhone");
                
                $stmt = $pdo->prepare("
                    SELECT id, fullName, phone 
                    FROM users 
                    WHERE phone = ? AND accountStatus = 'active'
                ");
                $stmt->execute([$normalizedPhone]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                // Debug: Vérifier si des utilisateurs existent avec un format similaire
                $stmt2 = $pdo->prepare("SELECT id, fullName, phone FROM users WHERE phone LIKE ?");
                $stmt2->execute(['%' . substr($normalizedPhone, -8) . '%']);
                $similarUsers = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                error_log("DEBUG verify_user - Utilisateurs similaires trouvés: " . json_encode($similarUsers));
                
                if ($user) {
                    error_log("DEBUG verify_user - Utilisateur trouvé: " . json_encode($user));
                    echo json_encode([
                        'success' => true,
                        'user' => [
                            'id' => $user['id'],
                            'name' => $user['fullName'],
                            'phone' => $user['phone']
                        ]
                    ]);
                } else {
                    error_log("DEBUG verify_user - Aucun utilisateur trouvé");
                    echo json_encode([
                        'success' => false,
                        'error' => 'Aucun utilisateur trouvé avec ce numéro',
                        'debug' => [
                            'originalPhone' => $phone,
                            'normalizedPhone' => $normalizedPhone,
                            'similarUsers' => count($similarUsers)
                        ]
                    ]);
                }
                break;
            }
            
            // Gestion spéciale pour les transferts
            if (isset($data['action']) && $data['action'] === 'transfer') {
                handleTransfer($pdo, $data);
                break;
            }
            
            // Vérifier les champs obligatoires
            if (!isset($data['userId']) || !isset($data['type']) || !isset($data['amount'])) {
                throw new Exception('Champs obligatoires manquants');
            }
            
            $stmt = $pdo->prepare('INSERT INTO transactions (userId, type, amount, status, description, lotId, paymentMethod, paymentProof, agentId, agentNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
            $result = $stmt->execute([
                $data['userId'],
                $data['type'],
                $data['amount'],
                $data['status'] ?? 'pending',
                $data['description'] ?? null,
                $data['lotId'] ?? null,
                $data['paymentMethod'] ?? null,
                $data['paymentProof'] ?? null,
                $data['agentId'] ?? null,
                $data['agentNumber'] ?? null
            ]);
            
            if (!$result) {
                throw new Exception('Erreur lors de l\'insertion de la transaction');
            }
            
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        // Construction dynamique de la requête pour permettre la mise à jour de agentId et agentNumber
        $fields = ['status = ?'];
        $params = [$data['status']];
        if (isset($data['processedAt'])) {
            $fields[] = 'processedAt = ?';
            $params[] = $data['processedAt'];
        }
        if (isset($data['processedBy'])) {
            $fields[] = 'processedBy = ?';
            $params[] = $data['processedBy'];
        }
        if (isset($data['reason'])) {
            $fields[] = 'reason = ?';
            $params[] = $data['reason'];
        }
        if (isset($data['agentId'])) {
            $fields[] = 'agentId = ?';
            $params[] = $data['agentId'];
        }
        if (isset($data['agentNumber'])) {
            $fields[] = 'agentNumber = ?';
            $params[] = $data['agentNumber'];
        }
        $params[] = $data['id'];
        $sql = 'UPDATE transactions SET ' . implode(', ', $fields) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode(['success' => true]);
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM transactions WHERE id = ?');
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

function handleTransfer($pdo, $data) {
    // Validation des données requises
    if (!isset($data['fromUserId']) || !isset($data['toPhone']) || !isset($data['amount'])) {
        throw new Exception('Données manquantes pour le transfert');
    }

    $fromUserId = intval($data['fromUserId']);
    $toPhone = trim($data['toPhone']);
    $amount = floatval($data['amount']);
    $description = isset($data['description']) ? trim($data['description']) : '';

    // Validation du montant
    if ($amount <= 0) {
        throw new Exception('Le montant doit être positif');
    }

    // Normaliser le numéro de téléphone
    $normalizedPhone = normalizePhoneNumber($toPhone);
    
    $pdo->beginTransaction();
    
    try {
        // Vérifier l'utilisateur expéditeur et son solde
        $stmt = $pdo->prepare("
            SELECT id, balance, phone, fullName 
            FROM users 
            WHERE id = ? AND accountStatus = 'active'
        ");
        $stmt->execute([$fromUserId]);
        $fromUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$fromUser) {
            throw new Exception('Utilisateur expéditeur introuvable ou inactif');
        }

        if ($fromUser['balance'] < $amount) {
            throw new Exception('Solde insuffisant pour effectuer ce transfert');
        }

        // Chercher l'utilisateur destinataire par numéro de téléphone
        $stmt = $pdo->prepare("
            SELECT id, phone, fullName 
            FROM users 
            WHERE phone = ? AND accountStatus = 'active'
        ");
        $stmt->execute([$normalizedPhone]);
        $toUser = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$toUser) {
            throw new Exception('Aucun utilisateur trouvé avec ce numéro de téléphone');
        }

        if ($toUser['id'] == $fromUserId) {
            throw new Exception('Vous ne pouvez pas transférer vers votre propre compte');
        }

        // Déduire le montant du compte expéditeur
        $stmt = $pdo->prepare("
            UPDATE users 
            SET balance = balance - ? 
            WHERE id = ?
        ");
        $stmt->execute([$amount, $fromUserId]);

        // Ajouter le montant au compte destinataire
        $stmt = $pdo->prepare("
            UPDATE users 
            SET balance = balance + ? 
            WHERE id = ?
        ");
        $stmt->execute([$amount, $toUser['id']]);

        // Créer la transaction pour l'expéditeur (débit)
        $transactionDescription = $description ? $description : "Transfert vers {$toUser['fullName']}";
        $stmt = $pdo->prepare("
            INSERT INTO transactions (userId, type, amount, description, status, createdAt) 
            VALUES (?, 'transfer_sent', ?, ?, 'completed', NOW())
        ");
        $stmt->execute([$fromUserId, $amount, $transactionDescription]);

        // Créer la transaction pour le destinataire (crédit)
        $receiverDescription = $description ? $description : "Transfert de {$fromUser['fullName']}";
        $stmt = $pdo->prepare("
            INSERT INTO transactions (userId, type, amount, description, status, createdAt) 
            VALUES (?, 'transfer_received', ?, ?, 'completed', NOW())
        ");
        $stmt->execute([$toUser['id'], $amount, $receiverDescription]);

        $pdo->commit();

        // Récupérer les nouveaux soldes
        $stmt = $pdo->prepare("SELECT balance FROM users WHERE id = ?");
        $stmt->execute([$fromUserId]);
        $newBalance = $stmt->fetchColumn();

        echo json_encode([
            'success' => true,
            'message' => "Transfert de {$amount} FCFA vers {$toUser['fullName']} effectué avec succès",
            'newBalance' => floatval($newBalance),
            'recipient' => [
                'name' => $toUser['fullName'],
                'phone' => $toUser['phone']
            ]
        ]);

    } catch (Exception $e) {
        $pdo->rollback();
        throw $e;
    }
}

function normalizePhoneNumber($phone) {
    // Supprimer tous les espaces, tirets et autres caractères non numériques sauf le +
    $phone = preg_replace('/[^\d+]/', '', $phone);
    
    // Si le numéro commence par +226, le garder tel quel
    if (strpos($phone, '+226') === 0) {
        return $phone;
    }
    
    // Si le numéro commence par 226, ajouter le +
    if (strpos($phone, '226') === 0) {
        return '+' . $phone;
    }
    
    // Si le numéro commence par 0, remplacer par +226
    if (strpos($phone, '0') === 0) {
        return '+226' . substr($phone, 1);
    }
    
    // Si le numéro fait 8 chiffres (format local), ajouter +226
    if (strlen($phone) === 8 && is_numeric($phone)) {
        return '+226' . $phone;
    }
    
    // Sinon, essayer d'ajouter +226 par défaut pour le Burkina Faso
    return '+226' . $phone;
}
?>
