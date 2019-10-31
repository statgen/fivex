"""
Models/ datastores
"""
import os
import pheget  # noqa


def locate_data(chrom):
    #return os.path.dirname(os.path.realpath(__file__)) + '/../data/' + chrom + '.All_Tissues.sorted.txt.gz'
    return os.path.join(pheget.app.config['DATA_DIR'], f'{chrom}.All_Tissues.sorted.txt.gz')
