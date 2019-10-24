"""
Models/ datastores
"""
import os
import pheget  # noqa


def locate_pickle():
    return(pheget.app.config['DATA_DIR'] + '/gene.symbol.pickle')

def locate_data(chrom):
    #return os.path.dirname(os.path.realpath(__file__)) + '/../data/' + chrom + '.All_Tissues.sorted.txt.gz'
    return pheget.app.config['DATA_DIR'] + '/' + chrom + '.All_Tissues.sorted.txt.gz'
