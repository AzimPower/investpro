<?php
// backend/notifications.php
// API pour gérer les notifications

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

include_once 'db.php';

$pdo = Database::getInstance(); // Récupérer la connexion optimisée
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            handleGet($pathParts);
            break;
        case 'POST':
            handlePost();
            break;
        case 'PUT':
            handlePut($pathParts);
            break;
        case 'DELETE':
            handleDelete($pathParts);
            break;
        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

function handleGet($pathParts) {
    global $pdo;
    
    // Support pour les deux formats d'URL:
    // 1. /backend/notifications/{userId} (RESTful)
    // 2. /backend/notifications.php?userId={userId} (paramètre GET)
    
    $userId = null;
    
    // Vérifier d'abord les paramètres GET
    if (isset($_GET['userId'])) {
        $userId = intval($_GET['userId']);
    }
    // Sinon vérifier le path RESTful
    elseif (count($pathParts) >= 2 && $pathParts[1] === 'notifications' && count($pathParts) >= 3) {
        $userId = intval($pathParts[2]);
    }
    
    if ($userId) {
        // Vérifier si c'est une demande de comptage des non-lus
        if ((count($pathParts) >= 4 && $pathParts[3] === 'unread-count') || isset($_GET['unread-count'])) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND isRead = 0");
            $stmt->execute([$userId]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode(['count' => $result['count']]);
            return;
        }
        
        // Récupérer toutes les notifications (perso + globales non supprimées)
        $stmt = $pdo->prepare("
            SELECT n.id, n.userId, n.title, n.message, n.type, n.category, n.isRead,
                   n.relatedId, n.createdAt, n.readAt,
                   nus.isRead AS userIsRead, nus.isDeleted AS userIsDeleted, nus.readAt AS userReadAt, nus.deletedAt AS userDeletedAt
            FROM notifications n
            LEFT JOIN notifications_user_status nus ON nus.notificationId = n.id AND nus.userId = ?
            WHERE (n.userId = ? OR n.userId = 0)
              AND (n.userId != 0 OR nus.isDeleted IS NULL OR nus.isDeleted = 0)
            ORDER BY n.createdAt DESC
            LIMIT 50
        ");
        $stmt->execute([$userId, $userId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($notifications as &$notification) {
            // Pour les globales, isRead = userIsRead sinon notification['isRead']
            if ($notification['userId'] == 0) {
                $notification['isRead'] = (bool)$notification['userIsRead'];
                $notification['readAt'] = $notification['userReadAt'];
            } else {
                $notification['isRead'] = (bool)$notification['isRead'];
            }
        }
        
        echo json_encode($notifications);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'User ID required']);
    }
}

function handlePost() {
    global $pdo;
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        return;
    }
    
    $required = ['userId', 'title', 'message', 'type'];
    foreach ($required as $field) {
        if (!isset($input[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Field '$field' is required"]);
            return;
        }
    }
    
    // Vérifier les doublons potentiels (même utilisateur, titre et message dans les 10 dernières secondes)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE userId = ? AND title = ? AND message = ? 
        AND createdAt >= DATE_SUB(NOW(), INTERVAL 10 SECOND)
    ");
    $stmt->execute([
        $input['userId'],
        $input['title'],
        $input['message']
    ]);
    $duplicateCheck = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($duplicateCheck['count'] > 0) {
        // Retourner une réponse de succès pour éviter les erreurs côté frontend
        // mais ne pas créer de doublon
        error_log("Notification dupliquée ignorée pour utilisateur {$input['userId']}: {$input['title']}");
        echo json_encode(['success' => true, 'message' => 'Duplicate notification ignored']);
        return;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO notifications (userId, title, message, type, category, relatedId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    $stmt->execute([
        $input['userId'],
        $input['title'],
        $input['message'],
        $input['type'],
        $input['category'] ?? 'general',
        $input['relatedId'] ?? null
    ]);
    
    $notificationId = $pdo->lastInsertId();
    
    // Récupérer la notification créée
    $stmt = $pdo->prepare("
        SELECT id, userId, title, message, type, category, isRead AS `read`, 
               relatedId, createdAt, readAt 
        FROM notifications 
        WHERE id = ?
    ");
    $stmt->execute([$notificationId]);
    $notification = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo json_encode($notification);
}

function handlePut($pathParts) {
    global $pdo;
    
    // Obtenir les données JSON du body
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Gestion des URLs REST
    if (count($pathParts) >= 3 && $pathParts[1] === 'notifications') {
        $notificationId = intval($pathParts[2]);
        
        if (count($pathParts) >= 4 && $pathParts[3] === 'read') {
            // Marquer une notification comme lue via REST URL
            $stmt = $pdo->prepare("
                UPDATE notifications 
                SET isRead = 1, readAt = NOW() 
                WHERE id = ?
            ");
            $stmt->execute([$notificationId]);
            
            echo json_encode(['success' => true]);
            return;
        }
    } else if (count($pathParts) >= 4 && $pathParts[1] === 'notifications' && $pathParts[2] === 'user') {
        $userId = intval($pathParts[3]);
        
        if (count($pathParts) >= 5 && $pathParts[4] === 'read-all') {
            // Marquer toutes les notifications de l'utilisateur comme lues via REST URL
            $stmt = $pdo->prepare("
                UPDATE notifications 
                SET isRead = 1, readAt = NOW() 
                WHERE userId = ? AND isRead = 0
            ");
            $stmt->execute([$userId]);
            
            echo json_encode(['success' => true]);
            return;
        }
    }
    
    // Gestion des méthodes JSON dans le body
    if ($input) {
        // Marquer une notification spécifique comme lue
        if (isset($input['id']) && isset($input['isRead']) && $input['isRead']) {
            $notificationId = intval($input['id']);
            $stmt = $pdo->prepare("SELECT userId FROM notifications WHERE id = ? LIMIT 1");
            $stmt->execute([$notificationId]);
            $notif = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($notif && $notif['userId'] == 0 && isset($input['userId'])) {
                // Marquer comme lu pour cet utilisateur (notifications_user_status)
                $userId = intval($input['userId']);
                $stmt = $pdo->prepare("INSERT INTO notifications_user_status (notificationId, userId, isRead, readAt) VALUES (?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE isRead = 1, readAt = NOW()");
                $stmt->execute([$notificationId, $userId]);
                echo json_encode(['success' => true, 'global' => true]);
                return;
            } else {
                // Marquer comme lu classique
                $stmt = $pdo->prepare("
                    UPDATE notifications 
                    SET isRead = 1, readAt = NOW() 
                    WHERE id = ?
                ");
                $stmt->execute([$notificationId]);
                echo json_encode(['success' => true, 'global' => false]);
                return;
            }
        }
        
        // Marquer toutes les notifications d'un utilisateur comme lues
        if (isset($input['userId']) && isset($input['markAllAsRead']) && $input['markAllAsRead']) {
            $userId = intval($input['userId']);
            
            $stmt = $pdo->prepare("
                UPDATE notifications 
                SET isRead = 1, readAt = NOW() 
                WHERE userId = ? AND isRead = 0
            ");
            $stmt->execute([$userId]);
            
            echo json_encode(['success' => true]);
            return;
        }
    }
    
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}

function handleDelete($pathParts) {
    global $pdo;
    
    // Obtenir les données JSON du body
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Gestion des URLs REST pour supprimer une notification spécifique
    if (count($pathParts) >= 3 && $pathParts[1] === 'notifications') {
        $notificationId = intval($pathParts[2]);
        
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ?");
        $stmt->execute([$notificationId]);
        
        echo json_encode(['success' => true]);
        return;
    }
    
    // Gestion de l'URL pour supprimer toutes les notifications d'un utilisateur
    if (count($pathParts) >= 5 && $pathParts[1] === 'notifications' && $pathParts[2] === 'user' && $pathParts[4] === 'all') {
        $userId = intval($pathParts[3]);
        
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE userId = ?");
        $stmt->execute([$userId]);
        
        echo json_encode(['success' => true]);
        return;
    }
    
    // Gestion des anciennes méthodes avec JSON dans le body
    if ($input && isset($input['id'])) {
        $notificationId = intval($input['id']);
        // Vérifier si la notification est globale
        $stmt = $pdo->prepare("SELECT userId FROM notifications WHERE id = ? LIMIT 1");
        $stmt->execute([$notificationId]);
        $notif = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($notif && $notif['userId'] == 0 && isset($input['userId'])) {
            // Marquer comme supprimée pour cet utilisateur (notifications_user_status)
            $userId = intval($input['userId']);
            $stmt = $pdo->prepare("INSERT INTO notifications_user_status (notificationId, userId, isDeleted, deletedAt) VALUES (?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE isDeleted = 1, deletedAt = NOW()");
            $stmt->execute([$notificationId, $userId]);
            echo json_encode(['success' => true, 'global' => true]);
            return;
        } else {
            // Supprimer classique
            $stmt = $pdo->prepare("DELETE FROM notifications WHERE id = ?");
            $stmt->execute([$notificationId]);
            echo json_encode(['success' => true, 'global' => false]);
            return;
        }
    }
    
    // Gestion pour supprimer toutes les notifications d'un utilisateur via JSON
    if ($input && isset($input['userId']) && isset($input['deleteAll']) && $input['deleteAll']) {
        $userId = intval($input['userId']);
        
        $stmt = $pdo->prepare("DELETE FROM notifications WHERE userId = ?");
        $stmt->execute([$userId]);
        
        echo json_encode(['success' => true]);
        return;
    }
    
    http_response_code(404);
    echo json_encode(['error' => 'Endpoint not found']);
}

// Fonction utilitaire pour créer une notification (appelée par d'autres scripts)
function createNotification($userId, $title, $message, $type, $category = 'general', $relatedId = null) {
    global $pdo;
    
    $stmt = $pdo->prepare("
        INSERT INTO notifications (userId, title, message, type, category, relatedId, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    
    return $stmt->execute([$userId, $title, $message, $type, $category, $relatedId]);
}

// Fonction pour envoyer des notifications automatiques basées sur les événements
function sendTransactionNotification($userId, $transactionType, $status, $amount) {
    $formattedAmount = number_format($amount, 0, ',', ' ') . ' FCFA';
    
    $messages = [
        'deposit' => [
            'pending' => ['title' => 'Dépôt en cours', 'message' => "Votre dépôt de {$formattedAmount} est en cours de traitement"],
            'approved' => ['title' => 'Dépôt approuvé', 'message' => "Votre dépôt de {$formattedAmount} a été approuvé"],
            'rejected' => ['title' => 'Dépôt rejeté', 'message' => "Votre dépôt de {$formattedAmount} a été rejeté"]
        ],
        'withdrawal' => [
            'pending' => ['title' => 'Retrait en cours', 'message' => "Votre demande de retrait de {$formattedAmount} est en cours de traitement"],
            'approved' => ['title' => 'Retrait approuvé', 'message' => "Votre retrait de {$formattedAmount} a été approuvé"],
            'rejected' => ['title' => 'Retrait rejeté', 'message' => "Votre retrait de {$formattedAmount} a été rejeté"]
        ]
    ];
    
    if (isset($messages[$transactionType][$status])) {
        $notif = $messages[$transactionType][$status];
        $type = $status === 'approved' ? 'success' : ($status === 'rejected' ? 'error' : 'info');
        
        createNotification($userId, $notif['title'], $notif['message'], $type, 'transaction');
    }
}

function sendEarningNotification($userId, $amount, $lotName) {
    $formattedAmount = number_format($amount, 0, ',', ' ') . ' FCFA';
    $title = 'Gain quotidien';
    $message = "Vous avez gagné {$formattedAmount} avec le lot {$lotName}";
    
    createNotification($userId, $title, $message, 'success', 'earning');
}

function sendCommissionNotification($userId, $amount, $level) {
    $formattedAmount = number_format($amount, 0, ',', ' ') . ' FCFA';
    $title = 'Commission de parrainage';
    $message = "Vous avez gagné {$formattedAmount} de commission niveau {$level}";
    
    createNotification($userId, $title, $message, 'success', 'earning');
}

// Fonction pour envoyer les notifications de commission après réclamation de gains
// Commission sur gain journalier : niveau 1 = 5%, niveau 2 = 2%
function sendEarningCommissionNotifications($earnerId, $earnerName, $dailyEarning, $lotName, $lotId) {
    global $pdo;
    // Récupérer les informations de l'utilisateur qui a réclamé
    $stmt = $pdo->prepare("SELECT referredBy, fullName FROM users WHERE id = ?");
    $stmt->execute([$earnerId]);
    $earner = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$earner || !$earner['referredBy']) {
        return; // Pas de parrain
    }
    // Commission niveau 1 (5%)
    $sponsor1Stmt = $pdo->prepare("SELECT id, fullName, referredBy FROM users WHERE id = ?");
    $sponsor1Stmt->execute([$earner['referredBy']]);
    $sponsor1 = $sponsor1Stmt->fetch(PDO::FETCH_ASSOC);
    if ($sponsor1) {
        $commission1 = floatval($dailyEarning) * 0.05;
        $formattedCommission1 = number_format($commission1, 2, ',', ' ');
        createNotification(
            $sponsor1['id'],
            'Commission de parrainage reçue',
            "Vous avez reçu {$formattedCommission1} FCFA de commission (5%) sur le gain journalier de {$earnerName} (lot {$lotName})",
            'success',
            'commission',
            $lotId
        );
        // Commission niveau 2 (2%)
        if ($sponsor1['referredBy']) {
            $sponsor2Stmt = $pdo->prepare("SELECT id, fullName FROM users WHERE id = ?");
            $sponsor2Stmt->execute([$sponsor1['referredBy']]);
            $sponsor2 = $sponsor2Stmt->fetch(PDO::FETCH_ASSOC);
            if ($sponsor2) {
                $commission2 = floatval($dailyEarning) * 0.02;
                $formattedCommission2 = number_format($commission2, 2, ',', ' ');
                createNotification(
                    $sponsor2['id'],
                    'Commission de parrainage reçue',
                    "Vous avez reçu {$formattedCommission2} FCFA de commission (2%) sur le gain journalier de {$earnerName} (lot {$lotName})",
                    'success',
                    'commission',
                    $lotId
                );
            }
        }
    }
}

// Commission sur achat de lot : niveau 1 = 10%, niveau 2 = 5%
function sendLotPurchaseCommissionNotifications($buyerId, $buyerName, $lotAmount, $lotName, $lotId) {
    global $pdo;
    // Récupérer les informations de l'utilisateur qui a acheté
    $stmt = $pdo->prepare("SELECT referredBy, fullName FROM users WHERE id = ?");
    $stmt->execute([$buyerId]);
    $buyer = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$buyer || !$buyer['referredBy']) {
        return; // Pas de parrain
    }
    // Commission niveau 1 (10%)
    $sponsor1Stmt = $pdo->prepare("SELECT id, fullName, referredBy FROM users WHERE id = ?");
    $sponsor1Stmt->execute([$buyer['referredBy']]);
    $sponsor1 = $sponsor1Stmt->fetch(PDO::FETCH_ASSOC);
    if ($sponsor1) {
        $commission1 = floatval($lotAmount) * 0.10;
        $formattedCommission1 = number_format($commission1, 2, ',', ' ');
        createNotification(
            $sponsor1['id'],
            'Commission de parrainage reçue',
            "Vous avez reçu {$formattedCommission1} FCFA de commission (10%) sur l'achat de lot de {$buyerName} (lot {$lotName})",
            'success',
            'commission',
            $lotId
        );
        // Commission niveau 2 (5%)
        if ($sponsor1['referredBy']) {
            $sponsor2Stmt = $pdo->prepare("SELECT id, fullName FROM users WHERE id = ?");
            $sponsor2Stmt->execute([$sponsor1['referredBy']]);
            $sponsor2 = $sponsor2Stmt->fetch(PDO::FETCH_ASSOC);
            if ($sponsor2) {
                $commission2 = floatval($lotAmount) * 0.05;
                $formattedCommission2 = number_format($commission2, 2, ',', ' ');
                createNotification(
                    $sponsor2['id'],
                    'Commission de parrainage reçue',
                    "Vous avez reçu {$formattedCommission2} FCFA de commission (5%) sur l'achat de lot de {$buyerName} (lot {$lotName})",
                    'success',
                    'commission',
                    $lotId
                );
            }
        }
    }
}

// Fonction automatique pour envoyer des notifications lors d'événements
function sendWelcomeNotification($userId, $userName) {
    $title = 'Bienvenue sur InvestPro !';
    $message = "Bienvenue {$userName} ! Votre compte a été créé avec succès. Explorez nos lots d'investissement pour commencer à gagner.";
    
    createNotification($userId, $title, $message, 'success', 'system');
}

function sendLowBalanceNotification($userId, $balance) {
    if ($balance < 10000) {
        $formattedBalance = number_format($balance, 0, ',', ' ') . ' FCFA';
        $title = 'Solde faible';
        $message = "Votre solde est de {$formattedBalance}. Pensez à recharger votre compte pour continuer à investir.";
        
        createNotification($userId, $title, $message, 'warning', 'system');
    }
}

function sendAgentRequestNotification($agentId, $type, $amount, $userId) {
    $formattedAmount = number_format($amount, 0, ',', ' ') . ' FCFA';
    $typeText = $type === 'deposit' ? 'dépôt' : 'retrait';
    $title = "Nouvelle demande de {$typeText}";
    $message = "Demande de {$typeText} de {$formattedAmount} de l'utilisateur #{$userId}";
    
    createNotification($agentId, $title, $message, 'info', 'agent');
}

function sendSystemMaintenanceNotification($message) {
    global $pdo;
    
    // Envoyer à tous les utilisateurs actifs
    $stmt = $pdo->query("SELECT id FROM users WHERE accountStatus = 'active'");
    $users = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($users as $userId) {
        createNotification($userId, 'Maintenance système', $message, 'warning', 'system');
    }
}
?>
