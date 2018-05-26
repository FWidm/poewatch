package com.poestats;

import com.poestats.league.LeagueEntry;
import com.poestats.pricer.Entry;
import com.poestats.pricer.StatusElement;
import com.poestats.pricer.maps.IndexMap;
import com.poestats.relations.entries.SupIndexedItem;
import com.poestats.relations.entries.SubIndexedItem;

import java.sql.*;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Database {
    //------------------------------------------------------------------------------------------------------------
    // Class variables
    //------------------------------------------------------------------------------------------------------------

    private Connection connection;

    //------------------------------------------------------------------------------------------------------------
    // Constructors
    //------------------------------------------------------------------------------------------------------------

    //------------------------------------------------------------------------------------------------------------
    // DB controllers
    //------------------------------------------------------------------------------------------------------------

    public void connect() {
        try {
            connection = DriverManager.getConnection(Config.db_address, Config.db_username, Config.getDb_password());
            connection.setCatalog(Config.db_database);
            connection.setAutoCommit(false);
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Failed to connect to database", 5);
            System.exit(0);
        }
    }

    public void disconnect() {
        try {
            if (connection != null) connection.close();
        } catch (SQLException ex) {
            ex.printStackTrace();
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Initial DB setup
    //------------------------------------------------------------------------------------------------------------

    private ArrayList<String> listAllTables() throws SQLException {
        PreparedStatement statement = connection.prepareStatement("SHOW tables");
        ResultSet result = statement.executeQuery();

        ArrayList<String> tables = new ArrayList<>();

        while (result.next()) {
            tables.add(result.getString("Tables_in_" + Config.db_database));
            System.out.println(result.getString("Tables_in_" + Config.db_database));
        }

        return tables;
    }

    //------------------------------------------------------------------------------------------------------------
    // Access methods
    //------------------------------------------------------------------------------------------------------------

    public List<LeagueEntry> getLeagues() {
        try {
            PreparedStatement statement = connection.prepareStatement("SELECT * FROM `leagues`");
            ResultSet result = statement.executeQuery();

            List<LeagueEntry> leagueEntries = new ArrayList<>();

            while (result.next()) {
                LeagueEntry leagueEntry = new LeagueEntry();

                // TODO: SQL database has additional field display
                leagueEntry.setId(result.getString("id"));
                leagueEntry.setEndAt(result.getString("start"));
                leagueEntry.setStartAt(result.getString("end"));

                leagueEntries.add(leagueEntry);
            }

            return leagueEntries;
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query database league list", 3);
            return null;
        }
    }

    /**
     * Compares provided league entries to ones present in database, updates any changes and adds missing leagues
     *
     * @param leagueEntries List of the most recent LeagueEntry objects
     */
    public void updateLeagues(List<LeagueEntry> leagueEntries) {
        if (leagueEntries == null) {
            Main.ADMIN.log_("Could not update database league list (null passed)", 3);
            return;
        }

        try {
            String query1 = "SELECT * FROM `leagues`";
            String query2 = "UPDATE TABLE `leagues` SET (`start`, `end`) VALUES (?, ?) WHERE `id`=?";
            String query3 = "INSERT INTO `leagues` (`id`, `start`, `end`) VALUES (?, ?, ?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);
            PreparedStatement statement3 = connection.prepareStatement(query3);

            ResultSet result = statement1.executeQuery();

            // Loop though database's league entries
            while (result.next()) {
                // Loop though provided league entries
                for (int i = 0; i < leagueEntries.size(); i++) {
                    // If there's a match and the info has changed, update the database entry
                    if (result.getString("id").equals(leagueEntries.get(i).getId())) {
                        String start = result.getString("start");
                        String end = result.getString("end");

                        String startNew = leagueEntries.get(i).getStartAt();
                        String endNew = leagueEntries.get(i).getEndAt();

                        boolean update = false;

                        if (start == null) {
                            if (startNew != null) update = true;
                        } else if (!start.equals(startNew)) update = true;

                        if (end == null) {
                            if (endNew != null) update = true;
                        } else if (!end.equals(endNew)) update = true;

                        if (update) {
                            if (startNew == null) statement2.setNull(1, 0);
                            else statement2.setString(1, startNew);

                            if (endNew == null) statement2.setNull(2, 0);
                            else statement2.setString(2, endNew);

                            statement2.setString(3, leagueEntries.get(i).getId());
                            statement2.addBatch();
                        }

                        leagueEntries.remove(i);
                        break;
                    }
                }
            }

            // Loop though entries that were not present in the database
            for (LeagueEntry leagueEntry : leagueEntries) {
                statement3.setString(1, leagueEntry.getId());

                if (leagueEntry.getStartAt() == null) statement3.setNull(2, 0);
                else statement3.setString(2, leagueEntry.getStartAt());

                if (leagueEntry.getEndAt() == null) statement3.setNull(3, 0);
                else statement3.setString(3, leagueEntry.getEndAt());

                statement3.addBatch();
            }

            // Execute the batches
            statement2.executeBatch();
            statement3.executeBatch();

            // Commit changes
            connection.commit();
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update database league list", 3);
        }
    }

    /**
     * Removes any previous and updates the changeID record in table `changeid`
     *
     * @param changeID New changeID string to store
     */
    public void updateChangeID(String changeID) {
        try {
            String query1 = "DELETE FROM `changeid`";
            String query2 = "INSERT INTO `changeid` (`changeid`) VALUES (?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);

            statement2.setString(1, changeID);

            statement1.execute();
            statement2.execute();

            connection.commit();
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update database change id", 3);
        }
    }

    /**
     * Gets a list of parent and child categories and their display names from the database
     *
     * @return Map of categories or null on error
     */
    public Map<String, List<String>> getCategories() {
        Map<String, List<String>> categories = new HashMap<>();

        try {
            String query =  "SELECT " +
                                "`category_parent`.`parent`, " +
                                "`category_parent`.`display`, " +
                                "`category_child`.`child`, " +
                                "`category_child`.`display` " +
                            "FROM `category_child`" +
                                "JOIN `category_parent`" +
                                    "ON `category_child`.`parent` = `category_parent`.`parent`";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            // Get parent categories
            while (result.next()) {
                String parent = result.getString(1);
                String parentDisplay = result.getString(2);

                String child = result.getString(3);
                String childDisplay = result.getString(4);

                List<String> childCategories = categories.getOrDefault(parent, new ArrayList<>());
                childCategories.add(child);
                categories.putIfAbsent(parent, childCategories);
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query categories", 3);
            return null;
        }

        return categories;
    }

    //--------------------
    // Item data
    //--------------------

    /**
     * Get item data relations from database
     *
     * @return Map of indexed items or null on error
     */
    public Map<String, SupIndexedItem> getItemData() {
        Map<String, SupIndexedItem> relations = new HashMap<>();

        try {
            String query =  "SELECT " +
                                "`item_data_sup`.`sup`, " +
                                "`item_data_sup`.`parent`, " +
                                "`item_data_sup`.`child`, " +
                                "`item_data_sup`.`name`, " +
                                "`item_data_sup`.`type`, " +
                                "`item_data_sup`.`frame`, " +
                                "`item_data_sup`.`key`, " +

                                "`item_data_sub`.`sub`, " +
                                "`item_data_sub`.`tier`, " +
                                "`item_data_sub`.`lvl`, " +
                                "`item_data_sub`.`quality`, " +
                                "`item_data_sub`.`corrupted`, " +
                                "`item_data_sub`.`links`, " +
                                "`item_data_sub`.`var`, " +
                                "`item_data_sub`.`key`, " +
                                "`item_data_sub`.`icon` " +
                            "FROM `item_data_sub`" +
                                "JOIN `item_data_sup`" +
                                    "ON `item_data_sub`.`sup` = `item_data_sup`.`sup`";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            // Get parent categories
            while (result.next()) {
                String sup = result.getString(1);
                String sub = result.getString(8);

                String supKey = result.getString(7);
                String subKey = result.getString(15);

                String parent = result.getString(2);
                String child = result.getString(3);

                String name = result.getString(4);
                String type = result.getString(5);
                int frame = result.getInt(6);

                String tier = result.getString(9);
                String lvl = result.getString(10);
                String quality = result.getString(11);
                String corrupted = result.getString(12);
                String links = result.getString(13);
                String var = result.getString(14);
                String icon = result.getString(16);

                SupIndexedItem supIndexedItem = relations.getOrDefault(sup, new SupIndexedItem());

                if (!relations.containsKey(sup)) {
                    if (child != null)  supIndexedItem.setChild(child);
                    if (type != null)   supIndexedItem.setType(type);

                    supIndexedItem.setParent(parent);
                    supIndexedItem.setName(name);
                    supIndexedItem.setFrame(frame);
                    supIndexedItem.setKey(supKey);
                }

                SubIndexedItem subIndexedItem = new SubIndexedItem();
                if (tier != null)       subIndexedItem.setTier(tier);
                if (lvl != null)        subIndexedItem.setLvl(lvl);
                if (quality != null)    subIndexedItem.setQuality(quality);
                if (corrupted != null)  subIndexedItem.setCorrupted(corrupted);
                if (links != null)      subIndexedItem.setLinks(links);
                if (var != null)        subIndexedItem.setVar(var);
                subIndexedItem.setKey(subKey);
                subIndexedItem.setIcon(icon);
                subIndexedItem.setSupIndexedItem(supIndexedItem);

                supIndexedItem.getSubIndexes().put(sub, subIndexedItem);
                relations.putIfAbsent(sup, supIndexedItem);
            }
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not query categories", 3);
            return null;
        }

        return relations;
    }

    /**
     * Compares provided item data to database entries and adds what's missing
     *
     * @param newSup Map of super index to SupIndexedItem
     * @param newSub Map of index to SubIndexedItem
     * @return True on success
     */
    public boolean updateItemData(Map<String, SupIndexedItem> newSup, Map<String, SubIndexedItem> newSub) {
        try {
            String querySup =   "INSERT INTO " +
                                    "`item_data_sup` " +
                                        "(`sup`, " +
                                        "`parent`, " +
                                        "`child`, " +
                                        "`name`, " +
                                        "`type`, " +
                                        "`frame`, " +
                                        "`key`) " +
                                    "VALUES " +
                                        "(?, ?, ?, ?, ?, ?, ?)";
            PreparedStatement statementSup = connection.prepareStatement(querySup);

            for (String sup : newSup.keySet()) {
                SupIndexedItem supIndexedItem = newSup.get(sup);

                statementSup.setString(1, sup);
                statementSup.setString(2, supIndexedItem.getParent());

                if (supIndexedItem.getChild() == null) statementSup.setNull(3, 0);
                else statementSup.setString(3, supIndexedItem.getChild());

                statementSup.setString(4, supIndexedItem.getName());

                if (supIndexedItem.getType() == null) statementSup.setNull(5, 0);
                else statementSup.setString(5, supIndexedItem.getType());

                statementSup.setInt(6, supIndexedItem.getFrame());
                statementSup.setString(7, supIndexedItem.getKey());

                statementSup.addBatch();
            }

            String querySub =   "INSERT INTO " +
                                    "`item_data_sub` " +
                                        "(`sup`, " +
                                        "`sub`, " +
                                        "`tier`, " +
                                        "`lvl`, " +
                                        "`quality`, " +
                                        "`corrupted`, " +
                                        "`links`, " +
                                        "`var`, " +
                                        "`key`, " +
                                        "`icon`) " +
                                    "VALUES " +
                                        "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            PreparedStatement statementSub = connection.prepareStatement(querySub);

            for (String index : newSub.keySet()) {
                String sup = index.substring(0, Config.index_superSize);
                String sub = index.substring(Config.index_superSize, Config.index_subSize);

                SubIndexedItem subIndexedItem = newSub.get(index);

                statementSub.setString(1, sup);
                statementSub.setString(2, sub);

                if (subIndexedItem.getTier() == null) statementSub.setNull(3, 0);
                else statementSub.setString(3, subIndexedItem.getTier());

                if (subIndexedItem.getLvl() == null) statementSub.setNull(4, 0);
                else statementSub.setString(4, subIndexedItem.getLvl());

                if (subIndexedItem.getQuality() == null) statementSub.setNull(5, 0);
                else statementSub.setString(5, subIndexedItem.getQuality());

                if (subIndexedItem.getCorrupted() == null) statementSub.setNull(6, 0);
                else statementSub.setString(6, subIndexedItem.getCorrupted());

                if (subIndexedItem.getLinks() == null) statementSub.setNull(7, 0);
                else statementSub.setString(7, subIndexedItem.getLinks());

                if (subIndexedItem.getVar() == null) statementSub.setNull(8, 0);
                else statementSub.setString(8, subIndexedItem.getVar());

                statementSub.setString(9, subIndexedItem.getKey());
                statementSub.setString(10, subIndexedItem.getIcon());

                statementSub.addBatch();
            }

            statementSup.executeBatch();
            statementSub.executeBatch();

            // Commit changes
            connection.commit();
            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            Main.ADMIN.log_("Could not update database league list", 3);
            return false;
        }
    }

    //--------------------
    // Status
    //--------------------

    /**
     * Queries status timers from the database
     *
     * @param statusElement StatusElement to fill out
     * @return True if successful
     */
    public boolean getStatus(StatusElement statusElement) {
        try {
            PreparedStatement statement = connection.prepareStatement("SELECT * FROM `status`");
            ResultSet result = statement.executeQuery();

            while (result.next()) {
                switch (result.getString("name")) {
                    case "twentyFourCounter":
                        statusElement.twentyFourCounter = result.getLong("val");
                        break;
                    case "sixtyCounter":
                        statusElement.sixtyCounter = result.getLong("val");
                        break;
                    case "tenCounter":
                        statusElement.tenCounter = result.getLong("val");
                        break;
                }
            }

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    /**
     * Removes any previous and updates the status records in table `status`
     *
     * @param statusElement StatusElement to copy
     * @return True on success
     */
    public boolean updateStatus(StatusElement statusElement) {
        try {
            String query1 = "DELETE FROM `status`";
            String query2 = "INSERT INTO `status` (`val`, `name`) VALUES (?, ?)";

            PreparedStatement statement1 = connection.prepareStatement(query1);
            PreparedStatement statement2 = connection.prepareStatement(query2);

            statement2.setLong(1, statusElement.twentyFourCounter);
            statement2.setString(2, "twentyFourCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.sixtyCounter);
            statement2.setString(2, "sixtyCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.tenCounter);
            statement2.setString(2, "tenCounter");
            statement2.addBatch();

            statement2.setLong(1, statusElement.lastRunTime);
            statement2.setString(2, "lastRunTime");
            statement2.addBatch();

            statement1.execute();
            statement2.executeBatch();
            connection.commit();

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    //--------------------
    // Entry management
    //--------------------

    public boolean getCurrency(String league, IndexMap indexMap) {
        String table = "league_" + league.toLowerCase() + "_item";

        try {
            String query =  "SELECT " +
                            "    (`sup`,`sub`,`mean`,`median`,`mode`,`exalted`," +
                            "    `count`,`quantity`,`inc`,`dec`)" +
                            "FROM `"+ table +"` AS i" +
                            "WHERE EXISTS (" +
                            "    SELECT * FROM `item_data_sup` AS a " +
                            "    WHERE a.sup = i.sup " +
                            "    AND a.parent = 'currency')";
            PreparedStatement statement = connection.prepareStatement(query);
            ResultSet result = statement.executeQuery();

            while (result.next()) {
                String sup = result.getString("sup");
                String sub = result.getString("sub");

                Entry entry = new Entry();
                entry.load(result, league);

                indexMap.put(sup+sub, entry);
            }

            return true;
        } catch (SQLException ex) {
            ex.printStackTrace();
            return false;
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Utility methods
    //------------------------------------------------------------------------------------------------------------

    private static void debug(ResultSet rs) throws SQLException {
        ResultSetMetaData rsmd = rs.getMetaData();
        int columnsNumber = rsmd.getColumnCount();
        while (rs.next()) {
            for (int i = 1; i <= columnsNumber; i++) {
                if (i > 1) System.out.print(",  ");
                String columnValue = rs.getString(i);
                System.out.print(columnValue + " (" + rsmd.getColumnName(i) + ")");
            }
            System.out.println();
        }
    }

    //------------------------------------------------------------------------------------------------------------
    // Getters
    //------------------------------------------------------------------------------------------------------------

    //------------------------------------------------------------------------------------------------------------
    // Setters
    //------------------------------------------------------------------------------------------------------------
}
