<?php
ini_set('display_errors', 0);
error_reporting(0);
// backend/user_lots.php
header('Content-Type: application/json');
require_once 'db.php';

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $userId = $_GET['userId'] ?? null;
        if ($userId) {
            $stmt = $pdo->prepare('SELECT * FROM user_lots WHERE userId = ?');
            $stmt->execute([$userId]);
            $userLots = $stmt->fetchAll();
        } else {
            $stmt = $pdo->query('SELECT * FROM user_lots');
            $userLots = $stmt->fetchAll();
        }
        echo json_encode($userLots);
        break;
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // Vérifier l'action spécifiée
        if (isset($data['action']) && $data['action'] === 'updateLastEarning') {
            // Vérifier l'expiration du lot avant de permettre la réclamation
            $userId = $data['userId'];
            $lotId = $data['lotId'];
            // Récupérer le lot actif de l'utilisateur
            $stmt = $pdo->prepare('SELECT * FROM user_lots WHERE userId = ? AND lotId = ? AND active = 1');
            $stmt->execute([$userId, $lotId]);
            $userLot = $stmt->fetch();

            if (!$userLot) {
                echo json_encode(['success' => false, 'error' => 'Lot non trouvé ou déjà inactif']);
                exit;
            }

            // Récupérer la durée du lot
            $lotStmt = $pdo->prepare('SELECT name, dailyReturn, duration FROM lots WHERE id = ?');
            $lotStmt->execute([$lotId]);
            $lot = $lotStmt->fetch();

            if (!$lot) {
                echo json_encode(['success' => false, 'error' => 'Lot inconnu']);
                exit;
            }

            $purchasedAt = new DateTime($userLot['purchasedAt']);
            $now = new DateTime();
            $durationDays = (int)$lot['duration'];
            $expirationDate = clone $purchasedAt;
            $expirationDate->modify("+{$durationDays} days");

            if ($now >= $expirationDate) {
                // Désactiver le lot expiré
                $deactivateStmt = $pdo->prepare('UPDATE user_lots SET active = 0 WHERE id = ?');
                $deactivateStmt->execute([$userLot['id']]);

                // Créer une notification pour l'utilisateur
                include_once 'notifications.php';
                $lotName = $lot['name'] ?? '';
                $notifTitle = 'Lot expiré';
                $notifMsg = "Votre lot $lotName a expiré. Veuillez acheter un nouveau lot pour continuer à réclamer vos gains.";
                createNotification(
                    $userId,
                    $notifTitle,
                    $notifMsg,
                    'warning',
                    'transaction',
                    $lotId
                );

                echo json_encode(['success' => false, 'error' => 'Ce lot a expiré. Veuillez acheter un nouveau lot pour continuer à réclamer vos gains.']);
                exit;
            }

            // Empêcher la réclamation si déjà faite aujourd'hui
            if ($userLot['lastEarningDate']) {
                $lastEarningDate = new DateTime($userLot['lastEarningDate']);
                $now = new DateTime();
                if ($lastEarningDate->format('Y-m-d') === $now->format('Y-m-d')) {
                    echo json_encode(['success' => false, 'error' => 'Vous avez déjà réclamé votre gain aujourd\'hui.']);
                    exit;
                }
            }

            // Fixer la date de réclamation côté serveur (empêche la triche côté client)
            $nowStr = (new DateTime())->format('Y-m-d H:i:s');
            $stmt = $pdo->prepare('UPDATE user_lots SET lastEarningDate = ? WHERE userId = ? AND lotId = ? AND active = 1');
            $stmt->execute([
                $nowStr,
                $userId,
                $lotId
            ]);

            // Récupérer les informations nécessaires pour les notifications
            $userStmt = $pdo->prepare('SELECT fullName FROM users WHERE id = ?');
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();

            if ($user && $lot) {
                // Ajouter du logging pour déboguer
                error_log("DEBUG - Données trouvées: userId={$userId}, user={$user['fullName']}, lot={$lot['name']}, dailyReturn={$lot['dailyReturn']}");

                // Inclure le fichier de notifications et appeler la fonction
                include_once 'notifications.php';

                // Créer notification pour l'utilisateur qui réclame
                $formattedEarning = number_format($lot['dailyReturn'], 0, ',', ' ');
                $result = createNotification(
                    $userId,
                    'Gain journalier réclamé',
                    "Vous avez réclamé votre gain journalier de {$formattedEarning} FCFA du lot {$lot['name']}",
                    'success',
                    'earning',
                    $lotId
                );
                error_log("DEBUG - Notification utilisateur créée: " . ($result ? 'SUCCESS' : 'FAILED'));

                // Créer notifications pour les parrains
                sendEarningCommissionNotifications(
                    $userId,
                    $user['fullName'],
                    $lot['dailyReturn'],
                    $lot['name'],
                    $lotId
                );

                error_log("DEBUG - Notifications envoyées avec succès");
            } else {
                error_log("DEBUG - Données manquantes: user=" . ($user ? 'OK' : 'NULL') . ", lot=" . ($lot ? 'OK' : 'NULL'));
            }

            echo json_encode(['success' => true]);
        } else {
            // Création d'un nouveau user_lot
            $stmt = $pdo->prepare('INSERT INTO user_lots (userId, lotId, purchasedAt, active, lastEarningDate) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([
                $data['userId'],
                $data['lotId'],
                $data['purchasedAt'] ?? date('Y-m-d H:i:s'),
                $data['active'] ?? true,
                $data['lastEarningDate'] ?? null
            ]);
            echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
        }
        break;
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $stmt = $pdo->prepare('UPDATE user_lots SET active = ?, lastEarningDate = ? WHERE id = ?');
        $stmt->execute([
            $data['active'],
            $data['lastEarningDate'] ?? null,
            $data['id']
        ]);
        echo json_encode(['success' => true]);
        break;
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        if ($id) {
            $stmt = $pdo->prepare('DELETE FROM user_lots WHERE id = ?');
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
