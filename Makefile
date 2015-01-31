CFLAGS		+=	-O3 -lbz2

PREFIX		?=	/usr/local
INSTALL_PROGRAM	?=	${INSTALL} -c -s -m 555
INSTALL_MAN	?=	${INSTALL} -c -m 444

all:		ubsdiff ubspatch
ubsdiff:	ubsdiff.c
ubspatch:	ubspatch.c

install:
	${INSTALL_PROGRAM} ubsdiff ubspatch ${PREFIX}/bin
ifndef WITHOUT_MAN
	${INSTALL_MAN} ubsdiff.1 ubspatch.1 ${PREFIX}/man/man1
endif

.PHONY: clean
clean:
	rm -f ubsdiff ubspatch
