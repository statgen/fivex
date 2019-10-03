"""pheget model (database) API."""
import sqlite3
import flask
import os
import pheget

def locate_data(chrom):
    return os.path.dirname(os.path.realpath(__file__)) + '/../data/' + chrom + '.All_Tissues.sorted.txt.gz'
