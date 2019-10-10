rm ../data/Homo_sapiens.GRCh38.97.chr.gff3.gz
rm ../data/chr*.All_Tissues.sorted.txt.gz*
rm ../data/gene.symbol.pickle
rm ../data/gene.chrom.pos.lookup.sqlite3.db
rm ../data/ID.only.gff3.gz*
ln -f -s -t ../data/ /net/amd/amkwong/browseQTL/all_chr/ensembl/Homo_sapiens.GRCh38.97.chr.gff3.gz
ln -f -s -t ../data/ /net/amd/amkwong/browseQTL/all_chr/data/by_chromosome/chr*.All_Tissues.sorted.txt.gz*
ln -f -s -t ../data/ /net/amd/amkwong/browseQTL/all_chr/ensembl/gene.symbol.pickle
ln -f -s -t ../data/ /net/amd/amkwong/browseQTL/all_chr/ensembl/gene.chrom.pos.lookup.sqlite3.db
ln -f -s -t ../data/ /net/amd/amkwong/browseQTL/all_chr/ensembl/ID.only.gff3.gz*
