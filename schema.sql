-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: matcha_pearl_db
-- ------------------------------------------------------
-- Server version	5.5.5-10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `CategoryID` int(11) NOT NULL AUTO_INCREMENT,
  `CategoryName` varchar(100) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  PRIMARY KEY (`CategoryID`),
  KEY `fk_cat_user` (`UserID`),
  CONSTRAINT `fk_cat_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `CustomerID` int(11) NOT NULL AUTO_INCREMENT,
  `ManagerID` int(11) NOT NULL,
  `FullName` varchar(100) NOT NULL,
  `Phone` varchar(20) NOT NULL,
  `TotalPoints` decimal(10,2) DEFAULT 0.00,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `Email` varchar(100) DEFAULT NULL,
  `PasswordHash` varchar(255) DEFAULT NULL,
  `MembershipLevel` varchar(50) DEFAULT 'Đồng',
  `CurrentSessionId` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`CustomerID`),
  UNIQUE KEY `unique_phone_manager` (`Phone`,`ManagerID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customervouchers`
--

DROP TABLE IF EXISTS `customervouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customervouchers` (
  `CustomerVoucherID` int(11) NOT NULL AUTO_INCREMENT,
  `CustomerID` int(11) NOT NULL,
  `VoucherID` int(11) NOT NULL,
  `ReceivedDate` datetime DEFAULT current_timestamp(),
  `UsedDate` datetime DEFAULT NULL,
  `Status` varchar(50) DEFAULT 'Ch╞░a d├╣ng',
  PRIMARY KEY (`CustomerVoucherID`),
  KEY `CustomerID` (`CustomerID`),
  KEY `VoucherID` (`VoucherID`),
  CONSTRAINT `customervouchers_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`CustomerID`) ON DELETE CASCADE,
  CONSTRAINT `customervouchers_ibfk_2` FOREIGN KEY (`VoucherID`) REFERENCES `vouchers` (`VoucherID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ingredients`
--

DROP TABLE IF EXISTS `ingredients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ingredients` (
  `IngredientID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Unit` varchar(20) NOT NULL,
  `CurrentStock` decimal(12,2) DEFAULT 0.00,
  `MinStockLevel` decimal(12,2) DEFAULT 0.00,
  `ManagerID` int(11) NOT NULL,
  `Status` int(11) DEFAULT 1,
  `BasePrice` decimal(12,2) DEFAULT 0.00,
  PRIMARY KEY (`IngredientID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventorylogs`
--

DROP TABLE IF EXISTS `inventorylogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventorylogs` (
  `LogID` int(11) NOT NULL AUTO_INCREMENT,
  `IngredientID` int(11) NOT NULL,
  `ChangeAmount` decimal(12,2) NOT NULL,
  `Type` varchar(50) NOT NULL,
  `ReferenceID` varchar(50) DEFAULT NULL,
  `ManagerID` int(11) NOT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `CreatedBy` int(11) NOT NULL,
  `TotalCost` decimal(12,2) DEFAULT 0.00,
  PRIMARY KEY (`LogID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orderitems`
--

DROP TABLE IF EXISTS `orderitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderitems` (
  `OrderItemID` int(11) NOT NULL AUTO_INCREMENT,
  `OrderID` int(11) DEFAULT NULL,
  `ProductID` int(11) DEFAULT NULL,
  `SugarLevel` varchar(20) DEFAULT NULL,
  `IceLevel` varchar(20) DEFAULT NULL,
  `Quantity` int(11) NOT NULL CHECK (`Quantity` >= 1),
  `SubTotal` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`OrderItemID`),
  KEY `OrderID` (`OrderID`),
  KEY `ProductID` (`ProductID`),
  CONSTRAINT `orderitems_ibfk_1` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`),
  CONSTRAINT `orderitems_ibfk_2` FOREIGN KEY (`ProductID`) REFERENCES `products` (`ProductID`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orderitemtoppings`
--

DROP TABLE IF EXISTS `orderitemtoppings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderitemtoppings` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `OrderItemID` int(11) DEFAULT NULL,
  `ToppingID` int(11) DEFAULT NULL,
  `PriceAtOrder` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `OrderItemID` (`OrderItemID`),
  KEY `ToppingID` (`ToppingID`),
  CONSTRAINT `orderitemtoppings_ibfk_1` FOREIGN KEY (`OrderItemID`) REFERENCES `orderitems` (`OrderItemID`),
  CONSTRAINT `orderitemtoppings_ibfk_2` FOREIGN KEY (`ToppingID`) REFERENCES `toppings` (`ToppingID`)
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `OrderID` int(11) NOT NULL AUTO_INCREMENT,
  `UserID` int(11) DEFAULT NULL,
  `TotalAmount` decimal(10,2) DEFAULT NULL,
  `PaymentMethod` varchar(50) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  `Status` varchar(20) DEFAULT 'COMPLETED',
  `CreatedBy` int(11) DEFAULT NULL,
  `CustomerID` int(11) DEFAULT NULL,
  `PointsEarned` decimal(10,2) DEFAULT 0.00,
  `PointsUsed` decimal(10,2) DEFAULT 0.00,
  `DiscountFromPoints` decimal(10,2) DEFAULT 0.00,
  `DiscountAmount` decimal(10,2) DEFAULT 0.00,
  `ShippingFee` decimal(10,2) DEFAULT 0.00,
  `FinalAmount` decimal(10,2) DEFAULT 0.00,
  `OrderType` varchar(50) DEFAULT 'Tß║íi chß╗ù',
  `ShippingAddress` varchar(255) DEFAULT NULL,
  `VoucherID` int(11) DEFAULT NULL,
  PRIMARY KEY (`OrderID`),
  KEY `UserID` (`UserID`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pointhistory`
--

DROP TABLE IF EXISTS `pointhistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pointhistory` (
  `PointHistoryID` int(11) NOT NULL AUTO_INCREMENT,
  `CustomerID` int(11) NOT NULL,
  `OrderID` int(11) DEFAULT NULL,
  `PointsChange` decimal(10,2) NOT NULL,
  `Type` varchar(50) NOT NULL,
  `Reason` varchar(255) DEFAULT NULL,
  `CreatedDate` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`PointHistoryID`),
  KEY `CustomerID` (`CustomerID`),
  CONSTRAINT `pointhistory_ibfk_1` FOREIGN KEY (`CustomerID`) REFERENCES `customers` (`CustomerID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `ProductID` int(11) NOT NULL AUTO_INCREMENT,
  `CategoryID` int(11) DEFAULT NULL,
  `ProductName` varchar(100) NOT NULL,
  `BasePrice` decimal(10,2) NOT NULL,
  `Description` varchar(255) DEFAULT NULL,
  `Image` varchar(255) DEFAULT NULL,
  `STATUS` int(11) DEFAULT 1,
  `UserID` int(11) DEFAULT NULL,
  PRIMARY KEY (`ProductID`),
  KEY `CategoryID` (`CategoryID`),
  KEY `fk_prod_user` (`UserID`),
  CONSTRAINT `fk_prod_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`CategoryID`) REFERENCES `categories` (`CategoryID`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `recipes`
--

DROP TABLE IF EXISTS `recipes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recipes` (
  `RecipeID` int(11) NOT NULL AUTO_INCREMENT,
  `ProductID` int(11) DEFAULT NULL,
  `ToppingID` int(11) DEFAULT NULL,
  `IngredientID` int(11) NOT NULL,
  `Amount` decimal(10,2) NOT NULL,
  `ManagerID` int(11) NOT NULL,
  PRIMARY KEY (`RecipeID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `toppings`
--

DROP TABLE IF EXISTS `toppings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `toppings` (
  `ToppingID` int(11) NOT NULL AUTO_INCREMENT,
  `ToppingName` varchar(100) NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `UserID` int(11) DEFAULT NULL,
  `Description` text DEFAULT NULL,
  `Image` varchar(255) DEFAULT NULL,
  `Status` int(11) DEFAULT 1,
  PRIMARY KEY (`ToppingID`),
  KEY `fk_top_user` (`UserID`),
  CONSTRAINT `fk_top_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `PASSWORD` varchar(255) NOT NULL,
  `FullName` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Role` varchar(20) DEFAULT 'admin',
  `ManagerID` int(11) DEFAULT NULL,
  `PayosClientId` varchar(255) DEFAULT NULL,
  `PayosApiKey` varchar(255) DEFAULT NULL,
  `PayosChecksumKey` varchar(255) DEFAULT NULL,
  `Avatar` varchar(255) DEFAULT NULL,
  `CurrentSessionId` varchar(50) DEFAULT NULL,
  `Status` varchar(20) DEFAULT 'active',
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Username` (`Username`),
  UNIQUE KEY `Email` (`Email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `vouchers`
--

DROP TABLE IF EXISTS `vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vouchers` (
  `VoucherID` int(11) NOT NULL AUTO_INCREMENT,
  `Code` varchar(50) NOT NULL,
  `Title` varchar(255) NOT NULL,
  `DiscountValue` decimal(10,2) NOT NULL,
  `DiscountType` varchar(20) NOT NULL,
  `MinOrderValue` decimal(10,2) DEFAULT 0.00,
  `MaxDiscountValue` decimal(10,2) DEFAULT NULL,
  `ExpiryDate` datetime DEFAULT NULL,
  `PointsRequired` int(11) DEFAULT 0,
  `IsActive` tinyint(1) DEFAULT 1,
  `CreatedAt` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`VoucherID`),
  UNIQUE KEY `Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-06 13:44:29
