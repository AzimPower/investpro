<?php
// db.php - Connexion optimisée à la base de données

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $host = 'srv1850.hstgr.io'; 
        $db   = 'u538245909_invest_pro';
        $user = 'u538245909_invest_pro';
        $pass = '@Le08novembre';
        $charset = 'utf8mb4';

        $dsn = "mysql:host=$host;dbname=$db;charset=$charset";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            // Connexion persistante (évite de rouvrir à chaque appel)
            PDO::ATTR_PERSISTENT => true
        ];

        $this->pdo = new PDO($dsn, $user, $pass, $options);
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance->pdo;
    }
}
