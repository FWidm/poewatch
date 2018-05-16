package com.poestats.History;

import com.google.gson.Gson;
import com.poestats.Config;
import com.poestats.League.LeagueEntry;
import com.poestats.Main;
import com.poestats.Misc;
import com.poestats.Pricer.Entries.DailyEntry;
import com.poestats.Pricer.Entry;

import java.io.File;
import java.io.IOException;
import java.io.Reader;
import java.io.Writer;
import java.util.HashMap;
import java.util.List;

public class HistoryController {
    //------------------------------------------------------------------------------------------------------------
    // Class variables
    //------------------------------------------------------------------------------------------------------------

    private IndexMap indexMap;
    private File inputFile;
    private File outputFile;
    private Gson gson = Main.getGson();
    private String league, category;

    private LeagueEntry leagueEntry;
    private int currentLeagueDay;
    private int totalLeagueLength;
    private boolean isPermanentLeague;

    //------------------------------------------------------------------------------------------------------------
    // Main methods
    //------------------------------------------------------------------------------------------------------------

    public void configure(String league, String category) {
        reset();

        isPermanentLeague = league.equals("Standard") || league.equals("Hardcore");
        this.category = category;
        this.league = league;

        inputFile = new File(Config.folder_history, league+"/"+category+".json");
        outputFile = new File(Config.folder_history, league+"/"+category+".tmp");

        if (new File(inputFile.getParent()).mkdirs()) {
            Main.ADMIN.log_("Created folder for: " + inputFile.getPath(), 1);
        }

        List<LeagueEntry> leagueEntries = Main.LEAGUE_MANAGER.getLeagues();
        if (leagueEntries == null) return;

        for (LeagueEntry leagueEntry : leagueEntries) {
            if (leagueEntry.getId().equals(league)) {
                this.leagueEntry = leagueEntry;
                currentLeagueDay = leagueEntry.getElapsedDays();
                totalLeagueLength = leagueEntry.getTotalDays();
                break;
            }
        }
    }

    public void readFile() {
        if (inputFile == null) {
            Main.ADMIN.log_("No variables defined for HistoryController ('"+league+"','"+category+"')", 3);
            return;
        } else if (leagueEntry == null) {
            Main.ADMIN.log_("Missing LeagueEntry for HistoryController ('"+league+"','"+category+"')", 3);
            return;
        }

        // Open up the reader
        try (Reader reader = Misc.defineReader(inputFile)) {
            if (reader == null) {
                Main.ADMIN.log_("File not found: '"+Config.file_categories.getPath()+"'", 4);
                throw new IOException();
            }

            indexMap = gson.fromJson(reader, IndexMap.class);
        } catch (IOException ex) {
            Main.ADMIN._log(ex, 4);
            indexMap = new IndexMap();
        }
    }

    public void add(String index, Entry entry) {
        if (indexMap == null) return;
        if (entry.getDb_daily().isEmpty()) return;

        int baseSize = isPermanentLeague ? Config.misc_defaultLeagueLength : totalLeagueLength;
        int lastIndex = isPermanentLeague ? Config.misc_defaultLeagueLength - 1 : currentLeagueDay;

        HistoryItem historyItem = indexMap.getOrDefault(index, new HistoryItem(baseSize));
        DailyEntry dailyEntry = entry.getDb_daily().get(entry.getDb_daily().size() - 1);

        // If it's a permanent league (i.e it has no fixed amount of days, then the arrays should be shifted left by
        // one every time a new value is added)
        if (isPermanentLeague) {
            int size = historyItem.getMean().length - 1;

            System.arraycopy(historyItem.getMean(),      1, historyItem.getMean(),        0, size);
            System.arraycopy(historyItem.getMedian(),    1, historyItem.getMedian(),      0, size);
            System.arraycopy(historyItem.getMode(),      1, historyItem.getMode(),        0, size);
            System.arraycopy(historyItem.getQuantity(),  1, historyItem.getQuantity(),    0, size);
            System.arraycopy(historyItem.getCount(),     1, historyItem.getCount(),       0, size);
        }

        // Add all the current values to the specified positions
        historyItem.getMean()[lastIndex]      = dailyEntry.getMean();
        historyItem.getMedian()[lastIndex]    = dailyEntry.getMedian();
        historyItem.getMode()[lastIndex]      = dailyEntry.getMode();
        historyItem.getQuantity()[lastIndex]  = dailyEntry.getQuantity();
        historyItem.getCount()[lastIndex]     = entry.getCount();

        indexMap.putIfAbsent(index, historyItem);
    }

    public void writeFile() {
        if (outputFile == null) {
            Main.ADMIN.log_("No variables defined for HistoryController ('"+league+"','"+category+"')", 3);
            return;
        } else if (indexMap == null) {
            Main.ADMIN.log_("No indexMap defined for HistoryController ('"+league+"','"+category+"')", 3);
            return;
        }

        try (Writer writer = Misc.defineWriter(outputFile)) {
            if (writer == null) throw new IOException();
            gson.toJson(indexMap, writer);
        } catch (IOException ex) {
            Main.ADMIN._log(ex, 4);
        }

        // Remove original file
        if (inputFile.exists() && !inputFile.delete()) {
            try {
                String errorMsg = "Unable to remove: '"+inputFile.getCanonicalPath()+"'";
                Main.ADMIN.log_(errorMsg, 4);
            } catch (IOException ex) { }
        }
        // Rename temp file to original file
        if (outputFile.exists() && !outputFile.renameTo(inputFile)) {
            try {
                String errorMsg = "Unable to remove: '"+outputFile.getCanonicalPath()+"'";
                Main.ADMIN.log_(errorMsg, 4);
            } catch (IOException ex) { }
        }

        // Clean up
        inputFile =  null;
        outputFile = null;
        league =  null;
        category =  null;
        indexMap = null;
    }

    private void reset() {
        indexMap = null;
        inputFile = null;
        outputFile = null;
        league = null;
        category = null;
        currentLeagueDay = -1;
        totalLeagueLength = -1;
        isPermanentLeague = false;
    }
}
