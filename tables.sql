-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Mar 30, 2026 at 11:52 AM
-- Server version: 8.0.34
-- PHP Version: 8.0.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

SET FOREIGN_KEY_CHECKS=0;

DROP TABLE IF EXISTS `shopping_cart`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `email` varchar(100) NOT NULL UNIQUE,
    `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    `city` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    `district` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    `type` ENUM('market', 'consumer') NOT NULL
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS `products` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `market_id` INT NOT NULL,
    `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    `stock` INT NOT NULL,
    `normal_price` DECIMAL (10, 2) NOT NULL,
    `discounted_price` DECIMAL (10, 2) NOT NULL,
    `expiration_date` DATE NOT NULL,
    `image` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_turkish_ci NOT NULL,
    FOREIGN KEY (`market_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;

CREATE TABLE IF NOT EXISTS `shopping_cart` (
    `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `consumer_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `quantity` INT DEFAULT 1,
    FOREIGN KEY (`consumer_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_turkish_ci;


/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;


-- INSERT STATEMENTS
-- generic password: 123456

-- INSERT STATEMENTS
-- generic password: 123456

INSERT INTO `users` (`id`, `email`, `name`, `password`, `city`, `district`, `type`) VALUES
(1, 'market1@gmail.com', 'Tok Market', '$2b$10$vK.mKFu/Ct9Co4qfrXpydeh/KJh4RPLEczwmkQek6SlmXgU1QhFoG', 'Ankara', 'Bilkent', 'market'),
(2, 'market2@gmail.com', 'Fresh & Save', '$2b$10$l.Hjnb.M4vg57icp0sUEKOFX767Qad/oEAOOhf0aL4J20uvdHc1F6', 'Ankara', 'Çankaya', 'market'),
(3, 'market3@market.com', 'Bosphorus Groceries', '$2b$10$VvOM.0UiglNznu/w75G6pOsUXISmHpmKEfLFsyjy.7lyT9qw6yLP6', 'İstanbul', 'Kadıköy', 'market'),
(4, 'consumer1@bilkent.edu.tr', 'Cüneyt Sevgi', '$2b$10$585OgIV6sSWUUNyeSKP/FO9y7cAioq2klt15NMnRQThBHpE5G0mvq', 'Ankara', 'Bilkent', 'consumer'),
(5, 'consumer2@gmail.com', 'Serkan Genç', '$2b$10$I13.10bPQXLoBHE./mwHK.bitWylIdmH25tA1XGq4TxP9tbKBLcfS', 'Ordu', 'Altınordu', 'consumer');

INSERT INTO products
(id, market_id, title, stock, normal_price, discounted_price, expiration_date, image)
VALUES
(1, 1, 'Strawberry Magnolia', 12, 140.00, 80.00, '2026-05-10', 'strawberry-magnolia.jpeg'),
(2, 1, 'Magnum Ruby', 15, 75.00, 45.00, '2026-05-12', 'magnum-ruby.jpeg'),
(3, 2, 'Berliner', 8, 90.00, 50.00, '2026-05-09', 'berliner.jpeg'),
(4, 1, 'Chocolate Donut', 10, 85.00, 45.00, '2026-05-11', 'chocolate-donut.jpeg'), 
(5, 3, 'Chocolate Eti Cin', 30, 25.00, 15.00, '2026-05-14', 'eticin.jpeg'),
(6, 3, 'Strawberry Eti Cin', 25, 25.00, 15.00, '2026-05-15', 'cilekli-eticin.jpeg'),
(7, 1, 'Ferrero Rocher', 20, 250.00, 150.00, '2026-05-20', 'ferrero-rocher.jpeg'),
(8, 1, 'Cherry Brownie', 6, 110.00, 60.00, '2026-05-09', 'visneli-brownie.jpeg'),
(9, 2, 'Iced Strawberry Matcha Latte', 5, 160.00, 90.00, '2026-05-10', 'iced-strawberry-matcha.jpeg'),
(10, 1, 'Iced Latte', 15, 120.00, 70.00, '2026-05-09', 'iced-latte.jpeg'),
(11, 2, 'Iced Matcha Latte', 8, 150.00, 85.00, '2026-05-11', 'iced-matcha.jpeg'),
(12, 1, 'Milk 1L', 18, 45.00, 25.00, '2026-05-12', 'milk.jpeg'),
(13, 1, 'Lactose Free Milk 1L', 12, 55.00, 30.00, '2026-05-14', 'lactose-free-milk.jpeg'),
(14, 2, 'Almond Milk 1L', 10, 95.00, 60.00, '2026-05-18', 'almond-milk.jpeg'),
(15, 1, 'Oatmilk 1L', 14, 100.00, 65.00, '2026-05-07', 'oatmilk.jpeg'),
(16, 2, 'Iced Chai Tea Latte', 7, 130.00, 75.00, '2026-05-10', 'iced-chai-tea-latte.jpeg'),
(17, 1, 'Kinder Bueno', 40, 45.00, 25.00, '2026-05-22', 'kinder-bueno.jpeg'),
(18, 1, 'Milka Lila Pause', 35, 35.00, 20.00, '2026-05-07', 'lila-pause.jpeg'),
(19, 1, 'Kahve Dünyası Gofrik', 50, 20.00, 10.00, '2026-05-16', 'gofrik.jpeg'),
(20, 1, 'Cafe Latte', 10, 110.00, 60.00, '2026-05-09', 'cafe-latte.jpeg');