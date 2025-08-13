<?php
// Configuration pour l'environnement de production Hostinger
// Remplacez ces valeurs par vos informations de base de données Hostinger

$host = 'srv1850.hstgr.io'; // ou l'adresse fournie par Hostinger
$db   = 'u538245909_invest_pro'; // Nom de votre base de données sur Hostinger
$user = 'u538245909_invest_pro'; // Nom d'utilisateur fourni par Hostinger
$pass = '@Le08novembre'; // Mot de passe fourni par Hostinger
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    throw new PDOException($e->getMessage(), (int)$e->getCode());
}

// Configuration des CORS pour la production
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
?>
