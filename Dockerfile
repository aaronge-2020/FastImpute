FROM ubuntu:latest

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    git \
    xz-utils \
    zlib1g-dev \
    python3-pip

RUN pip3 install cget

RUN git clone https://github.com/statgen/Minimac4.git
WORKDIR /Minimac4
RUN cget install -f ./requirements.txt
RUN mkdir build && cd build && cmake -DCMAKE_TOOLCHAIN_FILE=../cget/cget/cget.cmake .. && make && make install
